import { TonConnect, TonConnectUI } from "@tonconnect/ui";

import { requestWebWallet } from "../injected/wallet";
import { OmniConnector } from "../OmniConnector";
import { WalletType } from "../OmniWallet";
import { isInjected } from "../injected/hot";
import TonWallet from "./wallet";

class TonConnector extends OmniConnector<TonWallet> {
  private tonConnect!: TonConnectUI;

  type = WalletType.TON;
  isSupported = true;
  name = "TON Wallet";
  icon = "https://storage.herewallet.app/upload/3ffa61e237f8e38d390abd60200db8edff3ec2b20aad0cc0a8c7a8ba9c318124.png";
  id = "ton";

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
        if (!wallet) return this.removeWallet();
        this.setWallet(
          new TonWallet(this, {
            sendTransaction: (params: any) => this.tonConnect.sendTransaction(params),
            signData: (params: any) => this.tonConnect.signData(params),
            account: wallet.account,
          })
        );
      });

      this.tonConnect.setConnectRequestParameters({ state: "ready", value: { tonProof: "wibe3" } });
      this.tonConnect.connector.restoreConnection();

      if (isInjected()) {
        this.tonConnect.connector.getWallets().then((wallets) => {
          const wallet = wallets.find((w) => w.appName === "hot");
          if (wallet) this.tonConnect.connector.connect(wallet, { tonProof: "wibe3" });
        });
      }

      this.getStorage().then(({ type, address, publicKey }) => {
        if (type !== "web" || !address || !publicKey) return;
        this.connectWebWallet(address, publicKey);
      });
    }
  }

  connectWebWallet(address: string, publicKey: string) {
    this.setStorage({ type: "web", address, publicKey });
    const request = requestWebWallet(this.type, address);
    this.setWallet(
      new TonWallet(this, {
        sendTransaction: (params) => request("ton:sendTransaction", params),
        signData: (params) => request("ton:signData", params),
        account: { address, publicKey },
      })
    );
  }

  async connect() {
    this.tonConnect.openModal();
  }

  async silentDisconnect() {
    this.tonConnect.connector.disconnect();
    this.removeStorage();
  }
}

export default TonConnector;
