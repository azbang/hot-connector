import type { FinalExecutionOutcome } from "@near-wallet-selector/core";
import { uuid4 } from "./helpers/uuid";
import { NearConnector } from "./NearConnector";
import {
  Account,
  Network,
  SignAndSendTransactionParams,
  SignAndSendTransactionsParams,
  SignedMessage,
  SignInParams,
  SignMessageParams,
  WalletManifest,
} from "./types/wallet";

export class ParentFrameWallet {
  constructor(readonly connector: NearConnector, readonly manifest: WalletManifest) {}

  callParentFrame(method: string, params: any) {
    const id = uuid4();
    window.parent.postMessage({ type: "near-wallet-injected-request", id, method, params }, "*");

    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        if (event.data.type === "near-wallet-injected-response" && event.data.id === id) {
          window.removeEventListener("message", handler);
          if (event.data.success) resolve(event.data.result);
          else reject(event.data.error);
        }
      };

      window.addEventListener("message", handler);
    });
  }

  async signIn(params: SignInParams): Promise<Array<Account>> {
    const result = await this.callParentFrame("near:signIn", params);
    if (Array.isArray(result)) return result;
    return [result as Account];
  }

  async signOut(data?: { network?: Network }): Promise<void> {
    await this.callParentFrame("near:signOut", data);
  }

  async getAccounts(data?: { network?: Network }): Promise<Array<Account>> {
    return this.callParentFrame("near:getAccounts", data) as Promise<Array<Account>>;
  }

  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<FinalExecutionOutcome> {
    return this.callParentFrame("near:signAndSendTransaction", params) as Promise<FinalExecutionOutcome>;
  }

  async signAndSendTransactions(params: SignAndSendTransactionsParams): Promise<Array<FinalExecutionOutcome>> {
    return this.callParentFrame("near:signAndSendTransactions", params) as Promise<Array<FinalExecutionOutcome>>;
  }

  async signMessage(params: SignMessageParams): Promise<SignedMessage> {
    return this.callParentFrame("near:signMessage", params) as Promise<SignedMessage>;
  }
}
