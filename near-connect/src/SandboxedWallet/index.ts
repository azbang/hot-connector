import {
  Account,
  FinalExecutionOutcome,
  Network,
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

  async signIn(params?: SignInParams): Promise<Array<Account>> {
    const network = params?.network || this.connector.network;
    return this.executor.call("wallet:signIn", { ...params, network, contractId: params?.contractId || "" });
  }

  async signOut(data?: { network?: Network }): Promise<void> {
    const args = { ...data, network: data?.network || this.connector.network };
    await this.executor.call("wallet:signOut", args);
    await this.executor.clearStorage();
  }

  async getAccounts(data?: { network?: Network }): Promise<Array<Account>> {
    const args = { ...data, network: data?.network || this.connector.network };
    return this.executor.call("wallet:getAccounts", args);
  }

  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<FinalExecutionOutcome> {
    await this.connector.validateBannedNearAddressInTx(params);
    const args = { ...params, network: params.network || this.connector.network };
    return this.executor.call("wallet:signAndSendTransaction", args);
  }

  async signAndSendTransactions(params: SignAndSendTransactionsParams): Promise<Array<FinalExecutionOutcome>> {
    const args = { ...params, network: params.network || this.connector.network };
    for (const tx of params.transactions) await this.connector.validateBannedNearAddressInTx(tx);
    return this.executor.call("wallet:signAndSendTransactions", args);
  }

  async signMessage(params: SignMessageParams): Promise<SignedMessage> {
    const args = { ...params, network: params.network || this.connector.network };
    return this.executor.call("wallet:signMessage", args);
  }
}

export default SandboxWallet;
