import { html } from "../helpers/html";
import { Popup } from "./Popup";

export class AuthPopup extends Popup<{ loading: boolean }> {
  constructor(readonly delegate: { onApprove: () => Promise<void>; onReject: () => void }) {
    super(delegate);
  }

  create() {
    super.create({ show: true });
    this.addListener("button", "click", async () => {
      try {
        this.update({ loading: true });
        await this.delegate.onApprove();
        this.update({ loading: false });
      } catch (e) {
        this.update({ loading: false });
        throw e;
      }
    });
  }

  get loader() {
    return html`<svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid"
      width="48"
      height="48"
      style="shape-rendering: auto; display: block; background: transparent;"
      xmlns:xlink="http://www.w3.org/1999/xlink"
    >
      <circle
        stroke-dasharray="75.39822368615503 27.132741228718345"
        r="16"
        stroke-width="4"
        stroke="#000"
        fill="none"
        cy="50"
        cx="50"
      >
        <animateTransform
          keyTimes="0;1"
          values="0 50 50;360 50 50"
          dur="1.408450704225352s"
          repeatCount="indefinite"
          type="rotate"
          attributeName="transform"
        ></animateTransform>
      </circle>
    </svg>`;
  }

  get dom() {
    return html`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-header">
          <p>Authorization</p>
        </div>

        <div class="modal-body">
          <p style="text-align: center; color: #fff">
            To verify your account, you need to sign a message, this action is safe, the platform does not have access
            to your assets.
          </p>

          <button
            ${this.state.loading ? "disabled" : ""}
            style="
                margin-top: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 48px; 
                opacity: ${this.state.loading ? 0.5 : 1};
              "
          >
            ${this.state.loading ? this.loader : "Sign message"}
          </button>
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
