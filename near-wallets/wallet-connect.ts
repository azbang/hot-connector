import type { KeyPair, providers } from "near-api-js";
import type { AccessKeyViewRaw } from "near-api-js/lib/providers/provider.js";
import type { Transaction, Account, SignMessageParams } from "@near-wallet-selector/core";
import { createAction } from "@near-wallet-selector/wallet-utils";
import { WalletConnectModal } from "@walletconnect/modal";
import * as nearAPI from "near-api-js";

import { SelectorStorageKeyStore } from "./keystore";

interface LimitedAccessKeyPair {
  accountId: string;
  keyPair: KeyPair;
}

interface LimitedAccessAccount {
  accountId: string;
  publicKey: string;
}

const WC_METHODS = [
  "near_signIn",
  "near_signOut",
  "near_getAccounts",
  "near_signTransaction",
  "near_signTransactions",
  "near_signMessage",
];

const WC_EVENTS = ["chainChanged", "accountsChanged"];
const provider = new nearAPI.providers.JsonRpcProvider({ url: "https://relmn.aurora.dev" });
const keystore = new SelectorStorageKeyStore();

interface RetryOptions {
  retries?: number;
  interval?: number;
}

const timeout = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const retry = <Value>(func: () => Promise<Value>, opts: RetryOptions = {}): Promise<Value> => {
  const { retries = 5, interval = 500 } = opts;
  return func().catch((err) => {
    if (retries <= 1) throw err;
    return timeout(interval).then(() => {
      return retry(func, { ...opts, retries: retries - 1, interval: interval * 1.5 });
    });
  });
};

let modal: typeof WalletConnectModal.prototype;
const connect = async (network: string) => {
  if (!modal) {
    modal = new WalletConnectModal({
      chains: [`near:mainnet`, `near:testnet`],
      projectId: await window.selector.walletConnect.getProjectId(),
      explorerExcludedWalletIds: "ALL",
      themeMode: "dark",
    });
  }

  const result = await window.selector.walletConnect.connect({
    requiredNamespaces: {
      near: {
        chains: [`near:${network}`],
        methods: WC_METHODS,
        events: WC_EVENTS,
      },
    },
  });

  window.selector.ui.showIframe();
  await new Promise((resolve) => setTimeout(resolve, 100));
  modal.openModal({ uri: result.uri, standaloneChains: [`near:${network}`] });

  return new Promise(async (resolve, reject) => {
    modal.subscribeModal(({ open }) => {
      if (!open) reject(new Error("User cancelled pairing"));
    });

    while (true) {
      const session = await window.selector.walletConnect.getSession();
      if (session) resolve(session);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });
};

const disconnect = async () => {
  await window.selector.walletConnect.disconnect({
    topic: (await window.selector.walletConnect.getSession()).topic,
    reason: { code: 5900, message: "User disconnected" },
  });
};

const getSignatureData = (result: Uint8Array) => {
  if (result instanceof Uint8Array) {
    return result;
  } else if (Array.isArray(result)) {
    return new Uint8Array(result);
  } else if (typeof result === "object" && result !== null) {
    return new Uint8Array(Object.values(result));
  } else {
    throw new Error("Unexpected result type from near_signTransaction");
  }
};

const WalletConnect = async () => {
  const getAccounts = async (network: string): Promise<Array<Account>> => {
    const session = await window.selector.walletConnect.getSession();
    if (!session) return [];

    const accounts = session.namespaces["near"].accounts || [];
    const newAccounts = [];

    for (let i = 0; i < accounts.length; i++) {
      const signer = new nearAPI.InMemorySigner(keystore);
      const publicKey = await signer.getPublicKey(accounts[i].split(":")[2], network);
      newAccounts.push({
        accountId: accounts[i].split(":")[2],
        publicKey: publicKey ? publicKey.toString() : "",
      });
    }

    return newAccounts;
  };

  const validateAccessKey = (transaction: Transaction, accessKey: AccessKeyViewRaw) => {
    if (accessKey.permission === "FullAccess") return accessKey;
    const { receiver_id, method_names } = accessKey.permission.FunctionCall;
    if (transaction.receiverId !== receiver_id) return null;

    return transaction.actions.every((action) => {
      if (action.type !== "FunctionCall") return false;
      const { methodName, deposit } = action.params;
      if (method_names.length && method_names.includes(methodName)) return false;
      return parseFloat(deposit) <= 0;
    });
  };

  const signTransactions = async (transactions: Array<Transaction>, network: string) => {
    const signer = new nearAPI.InMemorySigner(keystore);
    const signedTransactions: Array<nearAPI.transactions.SignedTransaction> = [];
    const block = await provider.block({ finality: "final" });

    for (let i = 0; i < transactions.length; i += 1) {
      const transaction = transactions[i];
      const publicKey = await signer.getPublicKey(transaction.signerId, network);
      if (!publicKey) throw new Error("No public key found");

      const accessKey = await provider.query<AccessKeyViewRaw>({
        account_id: transaction.signerId,
        public_key: publicKey.toString(),
        request_type: "view_access_key",
        finality: "final",
      });

      if (!validateAccessKey(transaction, accessKey)) {
        throw new Error("Invalid access key");
      }

      const tx = nearAPI.transactions.createTransaction(
        transactions[i].signerId,
        nearAPI.utils.PublicKey.from(publicKey.toString()),
        transactions[i].receiverId,
        accessKey.nonce + i + 1,
        transaction.actions.map((action) => createAction(action)),
        nearAPI.utils.serialize.base_decode(block.header.hash)
      );

      const [, signedTx] = await nearAPI.transactions.signTransaction(tx, signer, transactions[i].signerId, network);
      signedTransactions.push(signedTx);
    }

    return signedTransactions;
  };

  const requestAccounts = async (network: string) => {
    return window.selector.walletConnect.request({
      topic: (await window.selector.walletConnect.getSession()).topic,
      chainId: `near:${network}`,
      request: {
        method: "near_getAccounts",
        params: {},
      },
    });
  };

  const requestSignMessage = async (messageParams: SignMessageParams & { accountId?: string }, network: string) => {
    const { message, nonce, recipient, callbackUrl, accountId } = messageParams;
    return window.selector.walletConnect.request({
      topic: (await window.selector.walletConnect.getSession()).topic,
      chainId: `near:${network}`,
      request: {
        method: "near_signMessage",
        params: {
          message,
          nonce,
          recipient,
          ...(callbackUrl && { callbackUrl }),
          ...(accountId && { accountId }),
        },
      },
    });
  };

  const requestSignTransaction = async (transaction: Transaction, network: string) => {
    const accounts = await requestAccounts(network);
    const account = accounts.find((x: any) => x.accountId === transaction.signerId);

    if (!account) {
      throw new Error("Invalid signer id");
    }

    const [block, accessKey] = await Promise.all([
      provider.block({ finality: "final" }),
      provider.query<AccessKeyViewRaw>({
        request_type: "view_access_key",
        finality: "final",
        account_id: transaction.signerId,
        public_key: account.publicKey,
      }),
    ]);

    const tx = nearAPI.transactions.createTransaction(
      transaction.signerId,
      nearAPI.utils.PublicKey.from(account.publicKey),
      transaction.receiverId,
      accessKey.nonce + 1,
      transaction.actions.map((action) => createAction(action)),
      nearAPI.utils.serialize.base_decode(block.header.hash)
    );

    const result = await window.selector.walletConnect.request({
      topic: (await window.selector.walletConnect.getSession()).topic,
      chainId: `near:${network}`,
      request: {
        method: "near_signTransaction",
        params: { transaction: tx.encode() },
      },
    });

    const signatureData = getSignatureData(result);

    return nearAPI.transactions.SignedTransaction.decode(Buffer.from(signatureData));
  };

  const requestSignTransactions = async (transactions: Array<Transaction>, network: string) => {
    if (!transactions.length) return [];
    const txs: Array<nearAPI.transactions.Transaction> = [];
    const [block, accounts] = await Promise.all([provider.block({ finality: "final" }), requestAccounts(network)]);

    for (let i = 0; i < transactions.length; i += 1) {
      const transaction = transactions[i];
      const account = accounts.find((x: any) => x.accountId === transaction.signerId);
      if (!account) throw new Error("Invalid signer id");

      const accessKey = await provider.query<AccessKeyViewRaw>({
        request_type: "view_access_key",
        finality: "final",
        account_id: transaction.signerId,
        public_key: account.publicKey,
      });

      txs.push(
        nearAPI.transactions.createTransaction(
          transaction.signerId,
          nearAPI.utils.PublicKey.from(account.publicKey),
          transaction.receiverId,
          accessKey.nonce + i + 1,
          transaction.actions.map((action) => createAction(action)),
          nearAPI.utils.serialize.base_decode(block.header.hash)
        )
      );
    }

    const results = await window.selector.walletConnect.request({
      topic: (await window.selector.walletConnect.getSession()).topic,
      chainId: `near:${network}`,
      request: {
        method: "near_signTransactions",
        params: { transactions: txs.map((x) => x.encode()) },
      },
    });

    return results.map((result: any) => {
      const signatureData = getSignatureData(result);
      return nearAPI.transactions.SignedTransaction.decode(Buffer.from(signatureData));
    });
  };

  const createLimitedAccessKeyPairs = async (network: string): Promise<Array<LimitedAccessKeyPair>> => {
    const accounts = await getAccounts(network);
    return accounts.map(({ accountId }) => ({
      keyPair: nearAPI.utils.KeyPair.fromRandom("ed25519"),
      accountId,
    }));
  };

  const requestSignIn = async (permission: nearAPI.transactions.FunctionCallPermission, network: string) => {
    const keyPairs = await createLimitedAccessKeyPairs(network);
    const limitedAccessAccounts: Array<LimitedAccessAccount> = keyPairs.map(({ accountId, keyPair }) => ({
      publicKey: keyPair.getPublicKey().toString(),
      accountId,
    }));

    await window.selector.walletConnect.request({
      topic: (await window.selector.walletConnect.getSession()).topic,
      chainId: `near:${network}`,
      request: {
        method: "near_signIn",
        params: {
          permission: permission,
          accounts: limitedAccessAccounts,
        },
      },
    });

    for (let i = 0; i < keyPairs.length; i += 1) {
      const { accountId, keyPair } = keyPairs[i];
      await keystore.setKey(network, accountId, keyPair);
    }
  };

  const requestSignOut = async (network: string) => {
    const accounts = await getAccounts(network);
    const limitedAccessAccounts: Array<LimitedAccessAccount> = [];

    for (let i = 0; i < accounts.length; i += 1) {
      const account = accounts[i];
      const keyPair = await keystore.getKey(network, account.accountId);
      if (!keyPair) continue;

      limitedAccessAccounts.push({
        accountId: account.accountId,
        publicKey: keyPair.getPublicKey().toString(),
      });
    }

    if (!limitedAccessAccounts.length) {
      return;
    }

    await window.selector.walletConnect.request({
      topic: (await window.selector.walletConnect.getSession()).topic,
      chainId: `near:${network}`,
      request: {
        method: "near_signOut",
        params: {
          accounts: limitedAccessAccounts,
        },
      },
    });
  };

  const signOut = async (network: string) => {
    if (await window.selector.walletConnect.getSession()) {
      await requestSignOut(network);
      await disconnect();
    }
  };

  return {
    async signIn({ contractId, methodNames = [], network }: any) {
      try {
        if (await window.selector.walletConnect.getSession()) {
          await disconnect();
        }

        await connect(network);

        await requestSignIn({ receiverId: contractId || "", methodNames }, network);
        return await getAccounts(network);
      } catch (err) {
        await signOut(network);
        throw err;
      }
    },

    signOut,

    async getAccounts(network: string) {
      return getAccounts(network);
    },

    async verifyOwner({ message }: any) {
      throw new Error("Method not supported");
    },

    async signMessage({ message, nonce, recipient, callbackUrl, network }: any) {
      try {
        if (!(await window.selector.walletConnect.getSession())) await connect(network);
        return await requestSignMessage({ message, nonce, recipient, callbackUrl }, network);
      } catch (err) {
        await disconnect();
        throw err;
      }
    },

    async signAndSendTransaction({ receiverId, actions, network }: any) {
      const accounts = await getAccounts(network).catch(() => []);
      if (!accounts.length) throw new Error("Wallet not signed in");
      const signerId = accounts[0].accountId;
      const resolvedTransaction: Transaction = { signerId: signerId, receiverId: receiverId, actions };

      try {
        const [signedTx] = await signTransactions([resolvedTransaction], network);
        return provider.sendTransaction(signedTx);
      } catch (err) {
        const signedTx = await requestSignTransaction(resolvedTransaction, network);
        return provider.sendTransaction(signedTx);
      }
    },

    async signAndSendTransactions({ transactions, network }: { transactions: any[]; network: string }) {
      const accounts = await getAccounts(network).catch(() => []);
      if (!accounts.length) throw new Error("Wallet not signed in");
      const signerId = accounts[0].accountId;

      const resolvedTransactions = transactions.map((x: any) => ({
        signerId: signerId,
        receiverId: x.receiverId,
        actions: x.actions,
      }));

      try {
        const signedTxs = await signTransactions(resolvedTransactions, network);
        const results: Array<providers.FinalExecutionOutcome> = [];

        for (let i = 0; i < signedTxs.length; i += 1) {
          results.push(await provider.sendTransaction(signedTxs[i]));
        }

        return results;
      } catch (err) {
        const signedTxs = await requestSignTransactions(resolvedTransactions, network);
        const results: Array<providers.FinalExecutionOutcome> = [];

        for (let i = 0; i < signedTxs.length; i += 1) {
          results.push(await provider.sendTransaction(signedTxs[i]));
        }

        return results;
      }
    },

    async createSignedTransaction() {
      throw new Error(`Method not supported`);
    },

    async signTransaction(transaction: any) {
      throw new Error(`Method not supported`);
    },

    async getPublicKey() {
      throw new Error(`Method not supported`);
    },

    async signNep413Message() {
      throw new Error(`Method not supported`);
    },

    async signDelegateAction() {
      throw new Error(`Method not supported`);
    },
  };
};

WalletConnect().then((wallet) => {
  window.selector.ready(wallet);
});
