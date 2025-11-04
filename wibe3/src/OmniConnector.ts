import { LogoutPopup } from "./popups/LogoutPopup";
import { OmniWallet, WalletType } from "./OmniWallet";
import { EventEmitter } from "./events";

export abstract class OmniConnector<T extends OmniWallet = OmniWallet> {
  wallet: T | null = null;
  protected events = new EventEmitter<{
    connect: { wallet: T };
    disconnect: { wallet: T };
  }>();

  abstract connect(): Promise<void>;
  abstract silentDisconnect(): Promise<void>;

  abstract isSupported: boolean;
  abstract type: WalletType;
  abstract name: string;
  abstract icon: string;
  abstract id: string;

  protected setWallet(wallet: T) {
    this.events.emit("connect", { wallet });
    this.wallet = wallet;
  }

  protected removeWallet() {
    this.events.emit("disconnect", { wallet: this.wallet! });
    this.wallet = null;
  }

  removeAllListeners() {
    this.events.removeAllListeners();
  }

  onConnect(handler: (payload: { wallet: T }) => void) {
    this.events.on("connect", handler);
    return () => this.events.off("connect", handler);
  }

  onDisconnect(handler: (payload: { wallet: T }) => void) {
    this.events.on("disconnect", handler);
    return () => this.events.off("disconnect", handler);
  }

  async disconnect({ silent = false }: { silent?: boolean } = {}) {
    if (silent) return this.silentDisconnect();
    return new Promise<void>((resolve, reject) => {
      const popup = new LogoutPopup({
        type: this.type,
        onApprove: async () => {
          await this.silentDisconnect();
          this.removeWallet();
          popup.destroy();
          resolve();
        },

        onReject: () => {
          reject(new Error("User rejected"));
          popup.destroy();
        },
      });

      popup.create();
    });
  }
}
