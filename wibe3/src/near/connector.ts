import { NearConnector } from "@hot-labs/near-connect";

import NearWallet from "./wallet";
import { WalletType } from "../OmniWallet";
import { OmniConnector } from "../OmniConnector";

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
      if (account) this.setWallet(new NearWallet(this, account.accountId, wallet));
    });

    this.connector.getConnectedWallet().then(async ({ wallet }) => {
      const [account] = await wallet.getAccounts();
      if (account) this.setWallet(new NearWallet(this, account.accountId, wallet));
    });
  }

  connectWebWallet(address: string) {
    this.setWallet(new NearWallet(this, address, {} as any));
  }

  async connect() {
    this.connector.connect();
  }

  async silentDisconnect() {
    this.connector.disconnect();
  }
}

export default Connector;
