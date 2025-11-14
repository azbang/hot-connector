import { sep43Modules, HotWalletModule, StellarWalletsKit, WalletNetwork, ISupportedWallet } from "@creit.tech/stellar-wallets-kit";

import { LocalStorage } from "../storage";
import { WalletType } from "../OmniWallet";
import { OmniConnector } from "../OmniConnector";
import { WalletsPopup } from "../popups/WalletsPopup";
import { isInjected } from "../injected/hot";
import StellarWallet from "./wallet";

class StellarConnector extends OmniConnector<StellarWallet> {
  storage = new LocalStorage();
  stellarKit: StellarWalletsKit;

  type = WalletType.STELLAR;
  name = "Stellar Wallet";
  icon = "https://storage.herewallet.app/upload/1469894e53ca248ac6adceb2194e6950a13a52d972beb378a20bce7815ba01a4.png";
  isSupported = true;
  id = "stellarkit";

  wallets: ISupportedWallet[] = [];

  constructor(stellarKit?: StellarWalletsKit) {
    super();

    this.stellarKit = stellarKit || new StellarWalletsKit({ network: WalletNetwork.PUBLIC, modules: isInjected() ? [new HotWalletModule()] : sep43Modules() });
    this.stellarKit.getSupportedWallets().then((wallets) => {
      const hot = wallets.find((w) => w.id === "hot-wallet");
      this.wallets = wallets.filter((w) => w.id !== "hot-wallet");
      if (hot) this.wallets.unshift(hot);
    });

    this.getConnectedWallet().then((data) => {
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

  async getConnectedWallet() {
    if (isInjected()) {
      this.stellarKit.setWallet("hot-wallet");
      const { address } = await this.stellarKit?.getAddress();
      return JSON.stringify({ id: "hot-wallet", address });
    }

    return await this.storage.get("hot-connector:stellar");
  }

  connectWebWallet(address: string) {
    this.setWallet(new StellarWallet(this, address));
    this.storage.set("hot-connector:stellar", JSON.stringify({ id: "hot-wallet", address }));
  }

  async connect() {
    return new Promise<void>(async (resolve, reject) => {
      const popup = new WalletsPopup({
        type: this.type,
        wallets: this.wallets.map((t) => ({ name: t.name, icon: t.icon, uuid: t.id, rdns: t.name })),
        onReject: () => (popup?.destroy(), reject()),
        onConnect: async (id: string) => {
          this.stellarKit.setWallet(id);
          const { address } = await this.stellarKit?.getAddress();
          this.setWallet(new StellarWallet(this, address));
          this.storage.set("hot-connector:stellar", JSON.stringify({ id, address }));
          popup.destroy();
          resolve();
        },
      });

      popup.create();
    });
  }

  async silentDisconnect() {
    this.storage.remove("hot-connector:stellar");
    this.stellarKit.disconnect();
  }
}

export default StellarConnector;
