import { NearConnector } from "@hot-labs/near-connect";

import NearWallet from "./wallet";
import { WalletType } from "../OmniWallet";
import { OmniConnector } from "../OmniConnector";

class Connector extends OmniConnector<NearWallet> {
  connector: NearConnector;

  type = WalletType.NEAR;
  name = "NEAR Wallet";
  icon = "https://storage.herewallet.app/ft/1010:native.png";
  isSupported = true;
  id = "near";

  constructor(connector?: NearConnector) {
    super();

    this.connector = connector || new NearConnector({ network: "mainnet" });
    this.connector.on("wallet:signOut", () => this.removeWallet());
    this.connector.on("wallet:signIn", ({ wallet }) => this.setWallet(new NearWallet(this, wallet)));
    this.connector.getConnectedWallet().then(({ wallet }) => this.setWallet(new NearWallet(this, wallet)));
  }

  async connect() {
    this.connector.connect();
  }

  async silentDisconnect() {
    this.connector.disconnect();
  }
}

export default Connector;
