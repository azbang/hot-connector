import type { NearWalletBase, SignAndSendTransactionParams, SignAndSendTransactionsParams, SignMessageParams, Account, SignedMessage, FinalExecutionOutcome, Network } from "../types/wallet";
import { PluginManager } from "./plugin-manager";

export class WalletProxy implements NearWalletBase {
  constructor(
    private wallet: NearWalletBase,
    private pluginManager: PluginManager
  ) {}

  get manifest() {
    return this.wallet.manifest;
  }

  async signIn(data?: { network?: Network; contractId?: string; methodNames?: string[] }): Promise<Account[]> {
    return this.pluginManager.executePluginChain(
      "signIn",
      this.wallet,
      data,
      (args) => this.wallet.signIn(args)
    );
  }

  async signOut(data?: { network?: Network }): Promise<void> {
    return this.pluginManager.executePluginChain(
      "signOut",
      this.wallet,
      data,
      (args) => this.wallet.signOut(args)
    );
  }

  async getAccounts(data?: { network?: Network }): Promise<Account[]> {
    return this.pluginManager.executePluginChain(
      "getAccounts",
      this.wallet,
      data,
      (args) => this.wallet.getAccounts(args)
    );
  }

  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<FinalExecutionOutcome> {
    return this.pluginManager.executePluginChain(
      "signAndSendTransaction",
      this.wallet,
      params,
      (args) => this.wallet.signAndSendTransaction(args)
    );
  }

  async signAndSendTransactions(params: SignAndSendTransactionsParams): Promise<FinalExecutionOutcome[]> {
    return this.pluginManager.executePluginChain(
      "signAndSendTransactions",
      this.wallet,
      params,
      (args) => this.wallet.signAndSendTransactions(args)
    );
  }

  async signMessage(params: SignMessageParams): Promise<SignedMessage> {
    return this.pluginManager.executePluginChain(
      "signMessage",
      this.wallet,
      params,
      (args) => this.wallet.signMessage(args)
    );
  }
}
