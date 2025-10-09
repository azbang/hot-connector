import { allowAllModules, ISupportedWallet, StellarWalletsKit, WalletNetwork } from "@creit.tech/stellar-wallets-kit";
import { LocalStorage } from "../../../near-connect/src/helpers/storage";

import { WalletType } from "../OmniWallet";
import { OmniConnector } from "../OmniConnector";
import StellarWallet from "./wallet";

class StellarConnector extends OmniConnector<StellarWallet> {
  storage = new LocalStorage();
  stellarKit: StellarWalletsKit;

  type = WalletType.STELLAR;
  name = "Stellar Wallet";
  icon = "https://storage.herewallet.app/ft/1100:native.png";
  isSupported = true;
  id = "stellarkit";

  constructor(stellarKit?: StellarWalletsKit) {
    super();

    this.stellarKit =
      stellarKit || new StellarWalletsKit({ network: WalletNetwork.PUBLIC, modules: allowAllModules() });

    this.storage.get("hot-connector:stellar").then((data) => {
      try {
        if (!data || !this.stellarKit) throw "No wallet";
        const { id, address } = JSON.parse(data);
        this.stellarKit.setWallet(id);
        this.setWallet(new StellarWallet(this, address));
      } catch {
        this.removeWallet();
      }
    });
  }

  async connect() {
    this.stellarKit.openModal({
      onWalletSelected: async (option: ISupportedWallet) => {
        this.stellarKit.setWallet(option.id);
        const { address } = await this.stellarKit?.getAddress();
        this.setWallet(new StellarWallet(this, address));
        this.storage.set("hot-connector:stellar", JSON.stringify({ id: option.id, address }));
      },
    });
  }

  async silentDisconnect() {
    this.storage.remove("hot-connector:stellar");
    this.stellarKit.disconnect();
  }
}

export default StellarConnector;
