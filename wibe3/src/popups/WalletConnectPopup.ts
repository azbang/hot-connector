import QRCode, { darkQR } from "../qrcode";
import { html } from "./html";
import { Popup } from "./Popup";

export class WalletConnectPopup extends Popup<{ uri: string }> {
  constructor(
    readonly delegate: {
      uri: string;
      onReject: () => void;
    }
  ) {
    super(delegate);
    this.update({ uri: delegate.uri });
  }

  create() {
    super.create({ show: true });
    if (this.state.uri) this.renderQR(this.state.uri);
  }

  update(data: Partial<{ uri: string }>) {
    super.update(data);
    if (data.uri) this.renderQR(data.uri);
  }

  handlers() {
    super.handlers();
    this.addListener(this.get(".copy-button"), "click", () => {
      navigator.clipboard.writeText(this.state.uri);
      this.get(".copy-button").innerHTML = "Link Copied";
      setTimeout(() => {
        this.get(".copy-button").innerHTML = "Copy Link";
      }, 2000);
    });
  }

  renderQR(uri: string) {
    const size = 215;
    const img = new Image();
    img.src = "https://storage.herewallet.app/upload/2470b14a81fcf84e7cb53230311a7289b96a49ab880c7fa7a22765d7cdeb1271.svg";
    const qrcode = new QRCode({
      ...darkQR,
      size: size,
      value: uri,
      ecLevel: "H",
      imageEcCover: 0.2,
      logo: img,
      fill: {
        type: "linear-gradient",
        position: [0, 0, 1, 1],
        colorStops: [
          [0, "#fff"],
          [1, "#fff"],
        ],
      },
    });

    this.get(".qr-code").innerHTML = "";
    this.get(".qr-code").appendChild(qrcode.canvas);
  }

  get dom() {
    return html`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-body">
          <div class="qr-code"></div>
          <div class="copy-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-copy" viewBox="0 0 16 16">
              <path
                fill-rule="evenodd"
                d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"
              ></path>
            </svg>
            <span>Copy Link</span>
          </div>
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
