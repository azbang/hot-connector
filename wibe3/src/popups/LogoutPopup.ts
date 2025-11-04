import { WalletType } from "../OmniWallet";
import { html } from "./html";
import { Popup } from "./Popup";

export class LogoutPopup extends Popup<{ type: WalletType }> {
  constructor(readonly delegate: { type: WalletType; onApprove: () => void; onReject: () => void }) {
    super(delegate);
    this.update({ type: delegate.type });
  }

  handlers() {
    super.handlers();
    this.addListener("button", "click", () => this.delegate.onApprove());
  }

  create() {
    super.create({ show: true });
  }

  get chainName() {
    if (this.state.type === WalletType.EVM) return "EVM";
    if (this.state.type === WalletType.SOLANA) return "Solana";
    if (this.state.type === WalletType.TON) return "TON";
    if (this.state.type === WalletType.STELLAR) return "Stellar";
    if (this.state.type === WalletType.NEAR) return "NEAR";
    if (this.state.type === WalletType.PASSKEY) return "Passkey";
    return "";
  }

  get dom() {
    return html` <div class="modal-container">
      <div class="modal-content">
        <div class="modal-header">
          <p>Disconnect ${this.chainName} wallet</p>
        </div>

        <div class="modal-body">
          <p style="text-align: center; color: #fff">Your local session will be cleared, see you there!</p>
          <button>Bye-bye</button>
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
