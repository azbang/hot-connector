import type { Wallet } from "@wallet-standard/base";
import UniversalProvider from "@walletconnect/universal-provider";

import { WalletType } from "../OmniWallet";
import { OmniConnector } from "../OmniConnector";
import { WalletsPopup } from "../popups/WalletsPopup";
import { isInjected } from "../injected/hot";
import SolanaProtocolWallet from "./protocol";
import { requestWebWallet } from "../injected/wallet";
import SolanaWallet from "./wallet";
import { getWallets } from "./wallets";

export interface SolanaConnectorOptions {
  projectId?: string;
  metadata?: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

const wallets = getWallets();

class SolanaConnector extends OmniConnector<SolanaWallet> {
  type = WalletType.SOLANA;
  name = "Solana Wallet";
  icon = "https://storage.herewallet.app/upload/8700f33153ad813e133e5bf9b791b5ecbeea66edca6b8d17aeccb8048eb29ef7.png";
  id = "solana";
  isSupported = true;

  wallets: Wallet[] = [];
  provider?: Promise<UniversalProvider>;
  _popup: WalletsPopup | null = null;

  constructor(options?: SolanaConnectorOptions) {
    super();

    wallets.get().forEach((wallet) => {
      if (this.wallets.find((w) => w.name === wallet.name)) return;
      this.wallets.push(wallet);
    });

    this.getConnectedWallet().then(async ({ type, address, id }) => {
      if (type === "web" && address) return this.connectWebWallet(address);

      try {
        const wallet = this.wallets.find((w) => w.name === id);
        if (!wallet) return;
        const protocolWallet = await SolanaProtocolWallet.connect(wallet, { silent: true });
        this.setWallet(new SolanaWallet(this, protocolWallet));
      } catch {
        this.removeStorage();
      }
    });

    wallets.on("register", async (wallet) => {
      if (this.wallets.find((w) => w.name === wallet.name)) return;
      this.wallets.push(wallet);
      this._popup?.update({
        wallets: this.wallets.map((t) => ({ name: t.name, icon: t.icon, uuid: t.name, rdns: t.name })),
      });

      try {
        const connected = await this.getConnectedWallet();
        if (connected !== wallet.name) return;
        const protocolWallet = await SolanaProtocolWallet.connect(wallet, { silent: true });
        this.setWallet(new SolanaWallet(this, protocolWallet));
      } catch {
        this.removeStorage();
      }
    });

    wallets.on("unregister", (wallet) => {
      this.wallets = this.wallets.filter((w) => w.name !== wallet.name);
    });
  }

  connectWebWallet(address: string) {
    const request = requestWebWallet(this.type, address);
    this.setStorage({ type: "web", address });
    this.setWallet(
      new SolanaWallet(this, {
        sendTransaction: async (transaction: any, _: any, options?: any) => await request("solana:sendTransaction", { transaction, options }),
        signMessage: async (message: string) => await request("solana:signMessage", { message }),
        disconnect: async () => {},
        address,
      })
    );
  }

  async getConnectedWallet() {
    if (isInjected()) return { type: "wallet", id: "HOT Wallet" };
    return this.getStorage();
  }

  async connect() {
    const provider = await this.provider;
    if (provider?.session) await provider.disconnect();

    return new Promise<void>(async (resolve, reject) => {
      this._popup = new WalletsPopup({
        type: this.type,
        wallets: this.wallets.map((t) => ({ name: t.name, icon: t.icon, uuid: t.name, rdns: t.name })),

        onReject: () => {
          provider?.cleanupPendingPairings();
          this._popup?.destroy();
          this._popup = null;
          reject();
        },

        onConnect: async (id: string) => {
          provider?.cleanupPendingPairings();
          const wallet = this.wallets.find((t) => t.name === id);
          if (!wallet) return;

          try {
            this.setStorage({ type: "wallet", id });
            const protocolWallet = await SolanaProtocolWallet.connect(wallet, { silent: false });
            this.setWallet(new SolanaWallet(this, protocolWallet));
            this._popup?.destroy();
            this._popup = null;
            resolve();
          } catch (e) {
            this.removeStorage();
            this._popup?.destroy();
            this._popup = null;
            reject(e);
          }
        },
      });

      this._popup?.create();
    });
  }

  async silentDisconnect() {
    this.removeStorage();
    const provider = await this.provider;
    provider?.disconnect();
  }
}

export default SolanaConnector;
