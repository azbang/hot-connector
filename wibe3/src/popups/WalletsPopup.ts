import QRCode, { darkQR } from "../qrcode";
import { html } from "./html";
import { Popup } from "./Popup";

interface Wallet {
  name: string;
  uuid: string;
  rdns: string;
  icon: string;
}

export class WalletsPopup extends Popup<{ uri?: string; wallets: Wallet[] }> {
  constructor(
    readonly delegate: {
      wallets: Wallet[];
      uri?: string;
      onWalletConnect: () => void;
      onConnect: (id: string) => void;
      onReject: () => void;
    }
  ) {
    super(delegate);
    this.update({ wallets: delegate.wallets });
  }

  create() {
    super.create({ show: true });
  }

  handlers() {
    super.handlers();
    this.root.querySelectorAll(".connect-item").forEach((item) => {
      if (!(item instanceof HTMLDivElement)) return;
      this.addListener(item, "click", () => {
        if (item.dataset.wallet === "walletconnect") {
          this.delegate.onWalletConnect();
        } else {
          this.delegate.onConnect(item.dataset.wallet as string);
        }
      });
    });
  }

  walletOption(wallet: Wallet) {
    return html`<div class="connect-item" data-wallet="${wallet.uuid}">
      <img src="${wallet.icon}" alt="${wallet.name}" />
      <div class="connect-item-info">
        <span>${wallet?.name}</span>
        <span class="wallet-address">${wallet?.rdns}</span>
      </div>
    </div>`;
  }

  get dom() {
    return html`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-body">
          <div class="connect-item" data-wallet="walletconnect">
            <img src="https://storage.herewallet.app/upload/2470b14a81fcf84e7cb53230311a7289b96a49ab880c7fa7a22765d7cdeb1271.svg" alt="walletconnect" />
            <div class="connect-item-info">
              <span>WalletConnect</span>
              <span class="wallet-address">Connect via QR</span>
            </div>
          </div>
          <div style="width: 100%; height: 1px; background: rgba(255, 255, 255, 0.1); flex-shrink: 0;"></div>
          ${this.state.wallets.map((wallet) => this.walletOption(wallet))}
        </div>

        <div class="footer">
          <img src="https://tgapp.herewallet.app/images/hot/hot-icon.png" alt="HOT Connector" />
          <p>HOT Connector</p>
          <p class="get-wallet-link">Don't have a wallet?</p>
        </div>
      </div>
    </div>`;
  }
}
