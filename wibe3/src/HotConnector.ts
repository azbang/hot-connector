import { MultichainPopup } from "./popups/MultichainPopup";
import { EventEmitter } from "./events";

import { OmniWallet, WalletType } from "./OmniWallet";
import { OmniConnector } from "./OmniConnector";

import PasskeyConnector from "./passkey/connector";
import NearConnector from "./near/connector";
import EvmConnector, { EvmConnectorOptions } from "./evm/connector";
import SolanaConnector, { SolanaConnectorOptions } from "./solana/connector";
import StellarConnector from "./stellar/connector";
import TonConnector from "./ton/connector";

export const near = () => new NearConnector();
export const evm = (options?: EvmConnectorOptions) => new EvmConnector(options);
export const solana = (options?: SolanaConnectorOptions) => new SolanaConnector(options);
export const stellar = () => new StellarConnector();
export const ton = () => new TonConnector();
export const passkey = () => new PasskeyConnector();

export class HotConnector {
  public connectors: OmniConnector[] = [];
  private events = new EventEmitter<{
    connect: { wallet: OmniWallet };
    disconnect: { wallet: OmniWallet };
  }>();

  constructor(options?: { connectors?: OmniConnector[] } & EvmConnectorOptions & SolanaConnectorOptions) {
    this.connectors = options?.connectors || [near(), evm(options), solana(options), stellar(), ton(), passkey()].filter((t) => t != null);

    this.connectors.forEach((t) => {
      t.onConnect((payload) => this.events.emit("connect", payload));
      t.onDisconnect((payload) => this.events.emit("disconnect", payload));
    });
  }

  get wallets(): OmniWallet[] {
    return this.connectors.map((t) => t.wallet).filter((t) => t != null);
  }

  addConnector(connector: OmniConnector) {
    this.connectors.push(connector);
    connector.onConnect((payload) => this.events.emit("connect", payload));
    connector.onDisconnect((payload) => this.events.emit("disconnect", payload));
  }

  removeConnector(connector: OmniConnector) {
    this.connectors = this.connectors.filter((t) => t !== connector);
    connector.removeAllListeners();
    connector.disconnect();
  }

  onConnect(handler: (payload: { wallet: OmniWallet }) => void) {
    this.events.on("connect", handler);
    return () => this.events.off("connect", handler);
  }

  onDisconnect(handler: (payload: { wallet: OmniWallet }) => void) {
    this.events.on("disconnect", handler);
    return () => this.events.off("disconnect", handler);
  }

  async connect(type?: WalletType | string) {
    if (type) return this.connectors.find((t) => t.type === type || t.id === type)?.connect();

    return new Promise<void>(async (resolve, reject) => {
      const popup = new MultichainPopup({
        wallets: await Promise.all(
          this.connectors.map(async (t) => ({
            address: await t.wallet?.getAddress().catch(() => undefined),
            name: t.name,
            icon: t.icon,
            id: t.id,
          }))
        ),

        onConnect: (type) => {
          this.connect(type);
          popup.destroy();
          resolve();
        },

        onDisconnect: (type) => {
          this.connectors.find((t) => t.id === type)?.disconnect();
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
