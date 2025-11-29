import { html } from "../helpers/html";
import { Popup } from "./Popup";

export class IframeWalletPopup extends Popup<{}> {
  constructor(readonly delegate: { iframe: HTMLIFrameElement; onApprove: () => void; onReject: () => void }) {
    super(delegate);
  }

  handlers() {
    super.handlers();
    this.addListener("button", "click", () => this.delegate.onApprove());
  }

  create() {
    super.create({ show: false });
    const modalBody = this.root.querySelector(".modal-body")! as HTMLElement;
    modalBody.appendChild(this.delegate.iframe);
    this.delegate.iframe.style.width = "100%";
    this.delegate.iframe.style.height = "720px";
    this.delegate.iframe.style.border = "none";
  }

  get dom() {
    return html` <div class="modal-container">
      <div class="modal-content">
        <div class="modal-body" style="padding: 0; overflow: auto;"></div>
        <div class="footer">
          <img src="https://tgapp.herewallet.app/images/hot/hot-icon.png" alt="HOT Connector" />
          <p>HOT Connector</p>
          <p class="get-wallet-link">Don't have a wallet?</p>
        </div>
      </div>
    </div>`;
  }
}
