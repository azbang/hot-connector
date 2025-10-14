import { html } from "./html";
import { Popup } from "./Popup";

export class PasskeyPopup extends Popup<{}> {
  constructor(readonly delegate: { onLogin: () => void; onCreate: (nickname?: string) => void; onReject: () => void }) {
    super(delegate);
  }

  handlers() {
    super.handlers();
    this.addListener(".passkey-login", "click", () => this.delegate.onLogin());
    this.addListener(".passkey-create", "click", () => {
      const input = this.get(".passkey-nickname") as HTMLInputElement;
      this.delegate.onCreate(input.value);
    });
  }

  create() {
    super.create({ show: true });
  }

  get dom() {
    return html` <div class="modal-container">
      <div class="modal-content">
        <div class="modal-header">
          <p>Connect Passkey</p>
        </div>

        <div class="modal-body">
          <input type="text" class="passkey-nickname" placeholder="Enter nickname" />
          <button style="margin-top: 0" class="passkey-create">Create new passkey</button>

          <div style="display: flex; width: 100%; align-items: center; justify-content: center; gap: 8px; margin-top: 8px;">
            <div style="height: 1px; flex: 1; background: rgba(255, 255, 255, 0.1);"></div>
            <p>or</p>
            <div style="height: 1px; flex: 1; background: rgba(255, 255, 255, 0.1);"></div>
          </div>

          <button style="margin-top: 8px" class="passkey-login">Connect existing passkey</button>
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
