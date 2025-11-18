import UniversalProvider from "@walletconnect/universal-provider";

import { isInjected } from "../injected/hot";
import { requestWebWallet } from "../injected/wallet";
import { WalletConnectPopup } from "../popups/WalletConnectPopup";
import { WalletsPopup } from "../popups/WalletsPopup";
import { OmniConnector } from "../OmniConnector";
import { WalletType } from "../OmniWallet";
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
  name = "EVM Wallet";
  icon = "https://storage.herewallet.app/upload/06b43b164683c2cbfe9a9c0699f0953fd56f1f802035e7701ea10501d9e091c6.png";
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
        if (connected.type === "walletconnect") {
          const address = provider.session?.namespaces.eip155?.accounts?.[0]?.split(":")[2];
          if (address) this.setWallet(new EvmAccount(this, { address, request: (t) => provider.request(t) }));
        }
      });
    }

    window.addEventListener<any>("eip6963:announceProvider", async (provider) => {
      if (this.wallets.find((t) => t.info.uuid === provider.detail.info.uuid)) return;

      if (provider.detail.info.rdns === "org.hot-labs") this.wallets.unshift(provider.detail);
      else this.wallets.push(provider.detail);

      this._popup?.update({ wallets: this.wallets.map((t) => t.info) });

      const connected = await this.getConnectedWallet();
      if (connected.type === "wallet" && connected.id === provider.detail.info.rdns) {
        try {
          const [address] = await provider.detail.provider.request({ method: "eth_requestAccounts" });
          const request = (t: any) => provider.detail.provider.request(t);
          if (address) this.setWallet(new EvmAccount(this, { address, request }));
        } catch (e) {
          this.removeStorage();
        }
      }
    });

    this.getStorage().then((data) => {
      if (data.type !== "web" || !data.address) return;
      this.connectWebWallet(data.address);
    });

    window.dispatchEvent(new Event("eip6963:requestProvider"));
  }

  connectWebWallet(address: string) {
    this.setStorage({ type: "web", address });
    const request = requestWebWallet(this.type, address);
    this.setWallet(new EvmAccount(this, { address, request: (args) => request("evm:request", args) }));
  }

  async getConnectedWallet() {
    if (isInjected()) return { type: "wallet", id: "org.hot-labs" };
    return await this.getStorage();
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

      const request = (t: any) => provider!.request(t);
      this.setWallet(new EvmAccount(this, { address, request }));
      this.setStorage({ type: "walletconnect" });
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
            const [address] = await wallet.provider.request({ method: "eth_requestAccounts" });
            if (!address) throw "No address found";
            this.setStorage({ type: "wallet", id: wallet.info.rdns });

            const request = (t: any) => provider!.request(t);
            this.setWallet(new EvmAccount(this, { address, request }));
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

export default EvmConnector;
