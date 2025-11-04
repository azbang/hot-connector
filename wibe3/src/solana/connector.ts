import type { Wallet } from "@wallet-standard/base";
import UniversalProvider from "@walletconnect/universal-provider";

import { WalletType } from "../OmniWallet";
import { OmniConnector } from "../OmniConnector";
import { WalletsPopup } from "../popups/WalletsPopup";
import { LocalStorage } from "../storage";
import { getWallets } from "./wallets";
import SolanaAccount from "./wallet";
import { isInjected } from "../injected/hot";

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

class SolanaConnector extends OmniConnector<SolanaAccount> {
  type = WalletType.SOLANA;
  name = "Solana Wallet";
  icon = "https://storage.herewallet.app/ft/1001:native.png";
  id = "solana-reown";
  isSupported = true;

  wallets: Wallet[] = [];
  provider?: Promise<UniversalProvider>;
  _popup: WalletsPopup | null = null;
  storage = new LocalStorage();

  constructor(options?: SolanaConnectorOptions) {
    super();

    wallets.get().forEach((wallet) => {
      if (this.wallets.find((w) => w.name === wallet.name)) return;
      this.wallets.push(wallet);
    });

    this.getConnectedWallet().then(async (connected) => {
      try {
        if (!connected) return;
        const wallet = this.wallets.find((w) => w.name === connected);
        if (!wallet) return;
        const account = new SolanaAccount(this, wallet);
        await account.getAccount({ silent: true });
        this.setWallet(account);
      } catch {
        this.storage.remove("solana:connected");
      }
    });

    wallets.on("register", async (wallet) => {
      if (this.wallets.find((w) => w.name === wallet.name)) return;
      this.wallets.push(wallet);
      this._popup?.update({
        wallets: this.wallets.map((t) => ({ name: t.name, icon: t.icon, uuid: t.name, rdns: t.name })),
      });

      const connected = await this.getConnectedWallet();
      if (connected !== wallet.name) return;
      try {
        const chain = new SolanaAccount(this, wallet);
        await chain.getAccount({ silent: true });
        this.setWallet(new SolanaAccount(this, wallet));
      } catch {
        this.storage.remove("solana:connected");
      }
    });

    wallets.on("unregister", (wallet) => {
      this.wallets = this.wallets.filter((w) => w.name !== wallet.name);
    });
  }

  async getConnectedWallet() {
    if (isInjected()) return "HOT Wallet";
    return this.storage.get("solana:connected");
  }

  async connect() {
    const provider = await this.provider;
    if (provider?.session) await provider.disconnect();

    return new Promise<void>(async (resolve, reject) => {
      this._popup = new WalletsPopup({
        wallets: this.wallets.map((t) => ({
          name: t.name,
          icon: t.icon,
          uuid: t.name,
          rdns: t.name,
        })),

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
            this.storage.set("solana:connected", id);
            const chain = new SolanaAccount(this, wallet);
            await chain.getAccount({ silent: false });
            this.setWallet(chain);
            this._popup?.destroy();
            this._popup = null;
            resolve();
          } catch (e) {
            this.storage.remove("solana:connected");
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
    this.storage.remove("solana:connected");
    const provider = await this.provider;
    provider?.disconnect();
  }
}

export default SolanaConnector;
