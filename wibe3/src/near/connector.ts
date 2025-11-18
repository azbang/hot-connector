import { NearConnector, SignAndSendTransactionParams, SignAndSendTransactionsParams, SignMessageParams } from "@hot-labs/near-connect";

import { WalletType } from "../OmniWallet";
import { OmniConnector } from "../OmniConnector";
import { requestWebWallet } from "../injected/wallet";
import NearWallet from "./wallet";

class Connector extends OmniConnector<NearWallet> {
  connector: NearConnector;

  type = WalletType.NEAR;
  name = "NEAR Wallet";
  icon = "https://storage.herewallet.app/upload/73a44e583769f11112b0eff1f2dd2a560c05eed5f6d92f0c03484fa047c31668.png";
  isSupported = true;
  id = "near";

  constructor(connector?: NearConnector) {
    super();

    this.connector = connector || new NearConnector({ network: "mainnet" });
    this.connector.on("wallet:signOut", () => this.removeWallet());
    this.connector.on("wallet:signIn", async ({ wallet }) => {
      const [account] = await wallet.getAccounts();
      if (account) this.setWallet(new NearWallet(this, account.accountId, account.publicKey, wallet));
    });

    this.connector.getConnectedWallet().then(async ({ wallet }) => {
      const [account] = await wallet.getAccounts();
      if (account) this.setWallet(new NearWallet(this, account.accountId, account.publicKey, wallet));
    });

    this.getStorage().then(({ type, address, publicKey }) => {
      if (type !== "web" || !address || !publicKey) return;
      this.connectWebWallet(address, publicKey);
    });
  }

  connectWebWallet(address: string, publicKey: string) {
    this.setStorage({ type: "web", address, publicKey });
    const request = requestWebWallet(this.type, address);
    this.setWallet(
      new NearWallet(this, address, publicKey, {
        signAndSendTransaction: (params: SignAndSendTransactionParams) => request("near:signAndSendTransaction", params),
        signAndSendTransactions: (params: SignAndSendTransactionsParams) => request("near:signAndSendTransactions", params),
        signMessage: (params: SignMessageParams) => request("near:signMessage", params),
        getAccounts: async () => [{ accountId: address, publicKey }],
        signIn: () => request("near:signIn", {}),
        signOut: async () => {},
        manifest: {} as any,
      })
    );
  }

  async connect() {
    this.connector.connect();
  }

  async silentDisconnect() {
    this.removeStorage();
    this.connector.disconnect();
  }
}

export default Connector;
