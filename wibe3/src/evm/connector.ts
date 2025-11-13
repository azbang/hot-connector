import UniversalProvider from "@walletconnect/universal-provider";

import { isInjected } from "../injected/hot";
import { WalletConnectPopup } from "../popups/WalletConnectPopup";
import { WalletsPopup } from "../popups/WalletsPopup";
import { OmniConnector } from "../OmniConnector";
import { WalletType } from "../OmniWallet";
import { LocalStorage } from "../storage";
import EvmAccount from "./wallet";

export interface EvmConnectorOptions {
  projectId?: string;
  chains?: number[];
  metadata?: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

const chains = [1, 10, 56, 137, 8453, 42161, 421613, 80001];

class EvmConnector extends OmniConnector<EvmAccount> {
  storage = new LocalStorage();

  name = "EVM Wallet";
  icon = "https://storage.herewallet.app/ft/1:native.png";
  type = WalletType.EVM;
  isSupported = true;
  id = "evm";

  chains = [1, 10, 56, 137, 8453, 42161, 421613, 80001];
  wallets: { provider: any; info: { name: string; uuid: string; rdns: string; icon: string } }[] = [];

  _popup: WalletsPopup | null = null;
  _walletconnectPopup: WalletConnectPopup | null = null;
  provider?: Promise<UniversalProvider>;

  constructor(options: EvmConnectorOptions = {}) {
    super();

    if (options.chains) this.chains.push(...options.chains);

    if (options.projectId) {
      this.provider = UniversalProvider.init({
        projectId: options.projectId,
        metadata: options.metadata,
        relayUrl: "wss://relay.walletconnect.org",
      });

      this.provider.then(async (provider) => {
        provider.on("display_uri", (uri: string) => {
          this._walletconnectPopup?.update({ uri });
        });

        const connected = await this.getConnectedWallet();
        if (connected === "walletconnect") {
          const address = provider.session?.namespaces.eip155?.accounts?.[0]?.split(":")[2];
          if (address) this.setWallet(new EvmAccount(this, provider));
        }
      });
    }

    window.addEventListener<any>("eip6963:announceProvider", async (provider) => {
      if (this.wallets.find((t) => t.info.uuid === provider.detail.info.uuid)) return;

      if (provider.detail.info.rdns === "org.hot-labs") this.wallets.unshift(provider.detail);
      else this.wallets.push(provider.detail);

      this._popup?.update({ wallets: this.wallets.map((t) => t.info) });

      const connected = await this.getConnectedWallet();
      if (connected === provider.detail.info.rdns) {
        try {
          await provider.detail.provider.request({ method: "wallet_requestPermissions" });
          this.setWallet(new EvmAccount(this, provider.detail.provider));
        } catch (e) {
          console.log("error", e);
          this.storage.remove("evm:connected");
        }
      }
    });

    window.dispatchEvent(new Event("eip6963:requestProvider"));
  }

  async getConnectedWallet() {
    if (isInjected()) return "org.hot-labs";
    return await this.storage.get("evm:connected");
  }

  async connectWalletConnect() {
    return new Promise<void>(async (resolve, reject) => {
      this._walletconnectPopup = new WalletConnectPopup({
        uri: "LOADING",
        onReject: async () => {
          const provider = await this.provider;
          provider?.cleanupPendingPairings();
          this._walletconnectPopup?.destroy();
          this._walletconnectPopup = null;
          reject();
        },
      });

      this._walletconnectPopup.create();
      const provider = await this.provider;
      const session = await provider
        ?.connect({
          namespaces: {
            eip155: {
              methods: ["eth_sendTransaction", "eth_signTransaction", "eth_sign", "personal_sign", "eth_signTypedData"],
              chains: chains.map((chain) => `eip155:${chain}`),
              events: ["chainChanged", "accountsChanged"],
              rpcMap: {},
            },
          },
        })
        .catch(() => null);

      this._walletconnectPopup?.destroy();
      this._walletconnectPopup = null;

      const address = session?.namespaces.eip155?.accounts?.[0]?.split(":")[2];
      if (!address) return reject();

      this.setWallet(new EvmAccount(this, provider!));
      this.storage.set("evm:connected", "walletconnect");
      this._popup?.destroy();
      resolve();
    });
  }

  async connect() {
    const provider = await this.provider;
    if (provider?.session) await provider.disconnect();

    return new Promise<void>(async (resolve, reject) => {
      this._popup = new WalletsPopup({
        wallets: this.wallets.map((t) => t.info),
        uri: provider ? "x" : "",
        type: this.type,

        onReject: () => {
          provider?.cleanupPendingPairings();
          this._popup?.destroy();
          this._popup = null;
          reject();
        },

        onWalletConnect: async () => {
          await this.connectWalletConnect();
          this._popup?.destroy();
          this._popup = null;
          resolve();
        },

        onConnect: async (id: string) => {
          provider?.cleanupPendingPairings();
          const wallet = this.wallets.find((t) => t.info.uuid === id);
          if (!wallet) return;

          try {
            await wallet.provider.request({ method: "wallet_requestPermissions" });
            this.storage.set("evm:connected", wallet.info.rdns);
            this.setWallet(new EvmAccount(this, wallet.provider));
            this._popup?.destroy();
            this._popup = null;
            resolve();
          } catch (e) {
            this.storage.remove("evm:connected");
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
    this.storage.remove("evm:connected");
    const provider = await this.provider;
    provider?.disconnect();
  }
}

export default EvmConnector;
