import { TonConnect, TonConnectUI } from "@tonconnect/ui";
import TonWallet from "./wallet";
import { WalletType } from "../OmniWallet";
import { OmniConnector } from "../OmniConnector";

class TonConnector extends OmniConnector<TonWallet> {
  private tonConnect!: TonConnectUI;

  type = WalletType.TON;
  isSupported = true;
  chainId = 1;
  id = "ton";
  name = "TON Wallet";
  icon = "https://storage.herewallet.app/ft/1111:native.png";

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
