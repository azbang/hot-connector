import type { Account, Network } from "@near-wallet-selector/core";
import { base_encode } from "near-api-js/lib/utils/serialize.js";
import { signTransactions } from "@near-wallet-selector/wallet-utils";
import type { FinalExecutionOutcome } from "near-api-js/lib/providers/index.js";
import type { Signer } from "near-api-js";
import * as nearAPI from "near-api-js";

const provider = new nearAPI.providers.JsonRpcProvider({
  url: "https://relmn.aurora.dev",
});

const networks: Record<string, Network> = {
  mainnet: {
    nodeUrl: "https://relmn.aurora.dev",
    networkId: "mainnet",
    helperUrl: "",
    explorerUrl: "",
    indexerUrl: "",
  },
  testnet: {
    nodeUrl: "https://rpc.testnet.near.org",
    networkId: "testnet",
    helperUrl: "",
    explorerUrl: "",
    indexerUrl: "",
  },
};

const checkExist = async () => {
  try {
    await window.selector.external("nightly.near", "isConnected");
  } catch {
    await window.selector.ui.whenApprove({ title: "Download Nightly", button: "Download" });
    window.selector.open("https://chromewebstore.google.com/detail/nightly/fiikommddbeccaoicoejoniammnalkfa");
  }
};

const Nightly = async () => {
  await window.selector.external("nightly.near", "connect").catch(() => {});

  const getAccounts = async (): Promise<Array<Account>> => {
    const { accountId, publicKey } = await window.selector.external("nightly.near", "account");
    if (!accountId) return [];

    return [{ accountId, publicKey: `ed25519:${base_encode(publicKey.data)}` }];
  };

  const signer: Signer = {
    createKey: () => {
      throw new Error("Not implemented");
    },

    getPublicKey: async (accountId) => {
      const accounts = await getAccounts();
      const account = accounts.find((a) => a.accountId === accountId);
      if (!account) throw new Error("Failed to find public key for account");
      return nearAPI.utils.PublicKey.from(account.publicKey!);
    },

    signMessage: async (message, accountId) => {
      const accounts = await getAccounts();
      const account = accounts.find((a) => a.accountId === accountId);

      if (!account) {
        throw new Error("Failed to find account for signing");
      }

      const signedTx = await window.selector.external("nightly.near", "signTransaction", message);
      return { signature: signedTx.signature.data, publicKey: signedTx.publicKey };
    },
  };

  return {
    async signIn() {
      await checkExist();
      const existingAccounts = await getAccounts();
      if (existingAccounts.length) return existingAccounts;
      await window.selector.external("nightly.near", "connect");
      return getAccounts();
    },

    async signOut() {
      await checkExist();
      await window.selector.external("nightly.near", "disconnect");
    },

    async getAccounts() {
      return await getAccounts();
    },

    async verifyOwner({ message }: any) {
      throw new Error(`Method not supported`);
    },

    async signMessage({ message, nonce, recipient, state }: any) {
      await checkExist();
      const isConnected = await window.selector.external("nightly.near", "isConnected");
      if (!isConnected) await window.selector.external("nightly.near", "connect");
      return await window.selector.external("nightly.near", "signMessage", {
        nonce: Array.from(nonce),
        recipient,
        message,
        state,
      });
    },

    async signAndSendTransaction({
      receiverId,
      actions,
      network,
    }: {
      receiverId: string;
      actions: any;
      network: string;
    }) {
      await checkExist();
      const accounts = await getAccounts();
      if (!accounts.length) throw new Error("Wallet not signed in");
      const signerId = accounts[0].accountId;
      const [signedTx] = await signTransactions([{ signerId, receiverId, actions }], signer, networks[network]);
      return provider.sendTransaction(signedTx);
    },

    async signAndSendTransactions({ transactions, network }: { transactions: any; network: string }) {
      await checkExist();
      const accounts = await getAccounts();
      if (!accounts.length) throw new Error("Wallet not signed in");
      const signerId = accounts[0].accountId;

      const signedTxs = await signTransactions(
        transactions.map((x: any) => ({ ...x, signerId })),
        signer,
        networks[network]
      );

      const results: Array<FinalExecutionOutcome> = [];
      for (let i = 0; i < signedTxs.length; i++) {
        results.push(await provider.sendTransaction(signedTxs[i]));
      }

      return results;
    },

    async createSignedTransaction({
      receiverId,
      actions,
      network,
    }: {
      receiverId: string;
      actions: any;
      network: string;
    }) {
      await checkExist();
      const accounts = await getAccounts();
      if (!accounts.length) throw new Error("Wallet not signed in");
      const signerId = accounts[0].accountId;
      const [signedTx] = await signTransactions([{ signerId, receiverId, actions }], signer, networks[network]);
      return signedTx;
    },

    async signTransaction({ transaction, network }: any) {
      await checkExist();
      return await nearAPI.transactions.signTransaction(
        transaction,
        signer,
        transaction.signerId,
        networks[network].networkId
      );
    },

    async getPublicKey() {
      throw new Error(`Method not supported`);
    },

    async signNep413Message() {
      throw new Error(`Method not supported`);
    },

    async signDelegateAction(delegateAction: any) {
      throw new Error(`Method not supported`);
    },
  };
};

Nightly().then((wallet) => {
  window.selector.ready(wallet);
});
