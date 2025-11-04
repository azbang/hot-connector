import { TonConnect, TonConnectUI } from "@tonconnect/ui";
import { OmniConnector } from "../OmniConnector";
import { WalletType } from "../OmniWallet";
import { isInjected } from "../injected/hot";
import TonWallet from "./wallet";

class TonConnector extends OmniConnector<TonWallet> {
  private tonConnect!: TonConnectUI;

  type = WalletType.TON;
  isSupported = true;
  name = "TON Wallet";
  icon = "https://storage.herewallet.app/ft/1111:native.png";
  id = "ton-connect";

  constructor(tonConnect?: TonConnectUI) {
    super();

    if (typeof window !== "undefined") {
      const hasTonConnect = !!document.getElementById("ton-connect");
      if (!hasTonConnect) {
        const div = document.createElement("div");
        document.body.appendChild(div);
        div.id = "ton-connect";
        div.style.display = "none";
      }

      this.tonConnect = tonConnect || new TonConnectUI({ connector: new TonConnect(), buttonRootId: "ton-connect" });
      this.tonConnect.onStatusChange(async (wallet) => {
        if (wallet) this.setWallet(new TonWallet(this, this.tonConnect));
        else this.removeWallet();
      });

      this.tonConnect.setConnectRequestParameters({ state: "ready", value: { tonProof: "hot-connector" } });
      this.tonConnect.connector.restoreConnection();

      if (isInjected()) {
        this.tonConnect.connector.getWallets().then((wallets) => {
          const wallet = wallets.find((w) => w.appName === "hot");
          if (wallet) this.tonConnect.connector.connect(wallet, { tonProof: "hot-connector" });
        });
      }
    }
  }

  async connect() {
    this.tonConnect.openModal();
  }

  async silentDisconnect() {
    this.tonConnect.connector.disconnect();
  }
}

export default TonConnector;
