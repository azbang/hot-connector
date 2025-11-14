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

  get google() {
    return html`
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none">
        <g clip-path="url(#clip0_21324_42766)">
          <path
            d="M27.3514 14.2618C27.3514 13.1146 27.2583 12.2775 27.0568 11.4094H13.9575V16.5871H21.6465C21.4915 17.8738 20.6544 19.8116 18.7941 21.1137L18.7681 21.287L22.9098 24.4956L23.1968 24.5242C25.8321 22.0904 27.3514 18.5093 27.3514 14.2618Z"
            fill="#4285F4"
          />
          <path
            d="M13.9574 27.9038C17.7244 27.9038 20.8868 26.6636 23.1966 24.5244L18.794 21.1138C17.6159 21.9354 16.0346 22.509 13.9574 22.509C10.2679 22.509 7.13651 20.0753 6.02025 16.7113L5.85663 16.7252L1.54997 20.0582L1.49365 20.2147C3.78794 24.7723 8.5006 27.9038 13.9574 27.9038Z"
            fill="#34A853"
          />
          <path
            d="M6.02062 16.7114C5.72609 15.8433 5.55563 14.9131 5.55563 13.952C5.55563 12.9908 5.72609 12.0607 6.00513 11.1926L5.99733 11.0077L1.6367 7.62122L1.49403 7.68908C0.54844 9.58036 0.00585938 11.7042 0.00585938 13.952C0.00585938 16.1998 0.54844 18.3235 1.49403 20.2148L6.02062 16.7114Z"
            fill="#FBBC05"
          />
          <path
            d="M13.9574 5.3947C16.5772 5.3947 18.3444 6.52635 19.3521 7.47205L23.2896 3.6275C20.8714 1.37969 17.7244 0 13.9574 0C8.5006 0 3.78794 3.1314 1.49365 7.68899L6.00475 11.1925C7.13651 7.82857 10.2679 5.3947 13.9574 5.3947Z"
            fill="#EB4335"
          />
        </g>
        <defs>
          <clipPath id="clip0_21324_42766">
            <rect width="27.37" height="28" fill="white" />
          </clipPath>
        </defs>
      </svg>
    `;
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
            <div style="margin: 4px 0;display: flex; width: 100%; align-items: center; justify-content: center; gap: 8px;">
              <div style="height: 1px; flex: 1; background: rgba(255,255,255,0.1);"></div>
              <div>or</div>
              <div style="height: 1px; flex: 1; background: rgba(255,255,255,0.1);"></div>
            </div>
            <div class="connect-item google-connect">
              <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: #1a1a1a;">
                ${this.google}
              </div>
              <div class="connect-item-info">
                <span>Continue with Google</span>
              </div>
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
