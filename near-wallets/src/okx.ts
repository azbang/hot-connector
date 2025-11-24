import { SignedTransaction } from "@near-js/transactions";
import { isCurrentBrowserSupported } from "./utils/detectBrowser";
import { NearRpc } from "./utils/rpc";

type InternalAction = any;
type FunctionCallAction = any;

const checkExist = async () => {
  try {
    await window.selector.external("okxwallet.near", "isSignedIn");
  } catch {
    let downloadUrl = "https://chromewebstore.google.com/detail/%E6%AC%A7%E6%98%93-web3-%E9%92%B1%E5%8C%85/mcohilncbfahbmgdjkbpemcciiolgcge";
    if (isCurrentBrowserSupported(["safari"])) downloadUrl = "https://apps.apple.com/us/app/okx-wallet/id6463797825";
    if (isCurrentBrowserSupported(["edge-chromium"]))
      downloadUrl = "https://microsoftedge.microsoft.com/addons/detail/%E6%AC%A7%E6%98%93-web3-%E9%92%B1%E5%8C%85/pbpjkcldjiffchgbbndmhojiacbgflha";

    await window.selector.ui.whenApprove({ title: "Download OKX Wallet", button: "Download" });
    window.selector.open(downloadUrl);
  }
};

const provider = new NearRpc(window.selector?.providers?.mainnet);

const okx = async (method: string, ...params: any[]): Promise<any> => {
  return await window.selector.external("okxwallet.near", method, ...params);
};

const OKXWallet = async () => {
  const signOut = async () => {
    if (!(await okx("isSignedIn"))) return;
    await okx("signOut");
  };

  const transformActions = (actions: Array<InternalAction>) => {
    return actions.map((action) => {
      return action.type === "FunctionCall" ? action.params : ({} as FunctionCallAction["params"]);
    });
  };

  const transformTransactions = (transactions: Array<{ receiverId: string; actions: Array<InternalAction> }[]>) => {
    return transactions.map((transaction) => {
      return transaction.map(({ receiverId, actions }) => {
        return { receiverId, actions: transformActions(actions) };
      });
    });
  };

  const getAccounts = async () => {
    const accountId = await okx("getAccountId");
    if (!accountId) return [];
    return [{ accountId }];
  };

  const getSignedTransaction = (signedTx: string) => {
    const buf = Buffer.from(signedTx, "base64");
    const signedTransaction = SignedTransaction.decode(buf);
    return signedTransaction;
  };

  return {
    async signIn({ contractId, methodNames }: { contractId: string; methodNames: Array<string> }) {
      try {
        await checkExist();
        const { accessKey, accountId } = await okx("requestSignIn", { contractId: contractId || "", methodNames });
        const publicKey = accessKey?.publicKey;
        return [{ accountId, publicKey: publicKey ? publicKey.toString() : undefined }];
      } catch (_) {
        await signOut();
        throw new Error("Failed to sign in");
      }
    },

    signOut,
    getAccounts,

    async verifyOwner() {
      throw new Error(`Method not supported by OKX Wallet`);
    },

    async signMessage(message: any) {
      try {
        await checkExist();
        const signedMessage = await okx("signMessage", message);
        return signedMessage;
      } catch (error) {
        throw new Error("sign Error");
      }
    },

    async signAndSendTransaction({ receiverId, actions }: { receiverId: string; actions: Array<InternalAction> }) {
      await checkExist();
      if (!(await okx("isSignedIn"))) throw new Error("Wallet not signed in");
      if (!receiverId) throw new Error("Receiver ID is required");

      try {
        const signedTx = await okx("signTransaction", { receiverId: receiverId, actions: transformActions(actions) });
        const signedTransaction = getSignedTransaction(signedTx);
        return provider.sendTransaction(signedTransaction as any);
      } catch (error) {
        console.error("signAndSendTransaction", error);
        throw new Error("sign Error");
      }
    },

    async signAndSendTransactions({ transactions }: { transactions: Array<{ receiverId: string; actions: Array<InternalAction> }[]> }) {
      await checkExist();
      if (!(await okx("isSignedIn"))) throw new Error("Wallet not signed in");

      try {
        const resp = await okx("requestSignTransactions", { transactions: transformTransactions(transactions) });
        const { txs } = resp;
        const results = [];

        for (let i = 0; i < txs.length; i++) {
          const signedTransaction = getSignedTransaction(txs[i].signedTx);
          results.push(await provider.sendTransaction(signedTransaction as any));
        }

        return results;
      } catch (error) {
        console.error("signAndSendTransactions", error);
        throw new Error("sign Error");
      }
    },

    async createSignedTransaction(receiverId: string, actions: Array<InternalAction>) {
      await checkExist();
      if (!(await okx("isSignedIn"))) throw new Error("Wallet not signed in");
      if (!receiverId) throw new Error("Receiver ID is required");

      try {
        const signedTx = await okx("signTransaction", { receiverId: receiverId, actions: transformActions(actions) });
        const signedTransaction = getSignedTransaction(signedTx);
        return signedTransaction;
      } catch (error) {
        throw new Error("Failed to create signed transaction");
      }
    },

    async signTransaction() {
      throw new Error(`Method not supported by OKX Wallet`);
    },

    async getPublicKey() {
      throw new Error(`Method not supported by OKX Wallet`);
    },

    async signNep413Message() {
      throw new Error(`Method not supported by OKX Wallet`);
    },

    async signDelegateAction() {
      throw new Error(`Method not supported by OKX Wallet`);
    },
  };
};

OKXWallet().then((wallet) => {
  window.selector.ready(wallet);
});
