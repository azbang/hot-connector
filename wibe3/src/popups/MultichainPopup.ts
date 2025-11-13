import { html } from "./html";
import { Popup } from "./Popup";

interface Wallet {
  id: string;
  name: string;
  icon: string;
  address: string | undefined;
}

export class MultichainPopup extends Popup<{ wallets: Wallet[] }> {
  constructor(
    readonly delegate: {
      wallets: Wallet[];
      onGoogleConnect?: () => void;
      onDisconnect: (id: string) => void;
      onConnect: (id: string) => void;
      onReject: () => void;
    }
  ) {
    super(delegate);
    this.update({ wallets: delegate.wallets });
  }

  create() {
    super.create({ show: true });

    this.addListener(".google-connect", "click", () => this.delegate.onGoogleConnect?.());

    this.root.querySelectorAll(".connect-item").forEach((item) => {
      if (!(item instanceof HTMLDivElement)) return;
      this.addListener(item, "click", () => {
        const wallet = this.state.wallets.find((w) => w.id === (item.dataset.wallet as string));
        if (wallet?.address) this.delegate.onDisconnect(item.dataset.wallet as string);
        else this.delegate.onConnect(item.dataset.wallet as string);
      });
    });
  }

  get logout() {
    return html`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z"
          fill="rgba(255,255,255,0.5)"
        />
      </svg>
    `;
  }

  walletOption(wallet: Wallet) {
    const address = wallet?.address || "";
    const truncatedAddress = address.length > 16 ? `${address.slice(0, 8)}...${address.slice(-8)}` : address;

    return html`<div class="connect-item" data-wallet="${wallet.id}">
      <img src="${wallet.icon}" alt="${wallet.name}" />
      <div class="connect-item-info">
        <span>${wallet?.name}</span>
        ${address ? html`<span class="wallet-address">${truncatedAddress}</span>` : ""}
      </div>
      ${address ? this.logout : ""}
    </div>`;
  }

  get dom() {
    return html` <div class="modal-container">
      <div class="modal-content">
        <div class="modal-header">
          <p>Select network</p>
        </div>

        <div class="modal-body">
          ${this.state.wallets.map((wallet) => this.walletOption(wallet))}
          ${this.delegate.onGoogleConnect != null &&
          html`
            <div>
              <button class="google-connect">Connect with Google</button>
            </div>
          `}
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
