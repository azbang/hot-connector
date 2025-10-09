import type { FinalExecutionOutcome } from "@near-wallet-selector/core";
import {
  Account,
  SignAndSendTransactionParams,
  SignAndSendTransactionsParams,
  SignedMessage,
  SignInParams,
  SignMessageParams,
  WalletManifest,
} from "../types/wallet";
import { NearConnector } from "../NearConnector";
import SandboxExecutor from "./executor";

export class SandboxWallet {
  executor: SandboxExecutor;

  constructor(readonly connector: NearConnector, readonly manifest: WalletManifest) {
    this.executor = new SandboxExecutor(connector, manifest);
  }

  async signIn(params: SignInParams): Promise<Array<Account>> {
    return this.executor.call("wallet:signIn", { ...params, network: params.network || this.connector.network });
  }

  async signOut(): Promise<void> {
    await this.executor.call("wallet:signOut", { network: this.connector.network });
    await this.executor.clearStorage();
  }

  async getAccounts(): Promise<Array<Account>> {
    return this.executor.call("wallet:getAccounts", { network: this.connector.network });
  }

  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<FinalExecutionOutcome> {
    const network = params.network || this.connector.network;
    return this.executor.call("wallet:signAndSendTransaction", { ...params, network });
  }

  async signAndSendTransactions(params: SignAndSendTransactionsParams): Promise<Array<FinalExecutionOutcome>> {
    const network = params.network || this.connector.network;
    return this.executor.call("wallet:signAndSendTransactions", { ...params, network });
  }

  async signMessage(params: SignMessageParams): Promise<SignedMessage> {
    const network = params.network || this.connector.network;
    return this.executor.call("wallet:signMessage", { ...params, network });
  }
}

export default SandboxWallet;
