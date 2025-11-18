import { sep43Modules, HotWalletModule, StellarWalletsKit, WalletNetwork, ISupportedWallet } from "@creit.tech/stellar-wallets-kit";

import { WalletType } from "../OmniWallet";
import { OmniConnector } from "../OmniConnector";
import { WalletsPopup } from "../popups/WalletsPopup";
import { requestWebWallet } from "../injected/wallet";
import { isInjected } from "../injected/hot";
import StellarWallet from "./wallet";

class StellarConnector extends OmniConnector<StellarWallet> {
  stellarKit: StellarWalletsKit;
  wallets: ISupportedWallet[] = [];

  type = WalletType.STELLAR;
  name = "Stellar Wallet";
  icon = "https://storage.herewallet.app/upload/1469894e53ca248ac6adceb2194e6950a13a52d972beb378a20bce7815ba01a4.png";
  isSupported = true;
  id = "stellar";

  constructor(stellarKit?: StellarWalletsKit) {
    super();

    this.stellarKit = stellarKit || new StellarWalletsKit({ network: WalletNetwork.PUBLIC, modules: isInjected() ? [new HotWalletModule()] : sep43Modules() });
    this.stellarKit.getSupportedWallets().then((wallets) => {
      const hot = wallets.find((w) => w.id === "hot-wallet");
      this.wallets = wallets.filter((w) => w.id !== "hot-wallet");
      if (hot) this.wallets.unshift(hot);
    });

    this.getConnectedWallet().then((data) => {
      if (!data || !this.stellarKit) throw "No wallet";

      if (data.type === "web" && data.address) {
        this.connectWebWallet(data.address);
        return;
      }

      this.stellarKit.setWallet(data.id!);
      const signMessage = async (message: string) => this.stellarKit.signMessage(message);
      this.setWallet(new StellarWallet(this, { address: data.address!, signMessage }));
    });
  }

  async getConnectedWallet() {
    if (isInjected()) {
      this.stellarKit.setWallet("hot-wallet");
      const { address } = await this.stellarKit?.getAddress();
      return { type: "wallet", id: "hot-wallet", address };
    }

    return await this.getStorage();
  }

  connectWebWallet(address: string) {
    const request = requestWebWallet(this.type, address);
    const signMessage = async (message: string) => request("stellar:signMessage", { message });
    this.setWallet(new StellarWallet(this, { address, signMessage }));
    this.setStorage({ type: "web", address });
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
          const signMessage = async (message: string) => this.stellarKit.signMessage(message);
          this.setWallet(new StellarWallet(this, { address, signMessage }));
          this.setStorage({ type: "wallet", id, address });
          popup.destroy();
          resolve();
        },
      });

      popup.create();
    });
  }

  async silentDisconnect() {
    this.removeStorage();
    this.stellarKit.disconnect();
  }
}

export default StellarConnector;
