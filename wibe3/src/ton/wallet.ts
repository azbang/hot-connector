import { SendTransactionRequest, TonConnectUI } from "@tonconnect/ui";
import { toUserFriendlyAddress } from "@tonconnect/ui";
import { base58, base64, hex } from "@scure/base";

import { OmniWallet, WalletType } from "../OmniWallet";
import TonConnector from "./connector";

class TonWallet extends OmniWallet {
  constructor(readonly connector: TonConnector, readonly wallet: TonConnectUI) {
    super(connector);
  }

  get type() {
    return WalletType.TON;
  }

  getAddress = async (): Promise<string> => {
    if (!this.wallet.account) throw new Error("No account found");
    return toUserFriendlyAddress(this.wallet.account.address);
  };

  getPublicKey = async (): Promise<string> => {
    if (!this.wallet.account?.publicKey) throw new Error("No public key found");
    return base58.encode(hex.decode(this.wallet.account.publicKey));
  };

  async getIntentsAddress() {
    if (!this.wallet.account?.publicKey) throw new Error("No public key found");
    return this.wallet.account.publicKey.toLowerCase();
  }

  async sendTransaction(msgs: SendTransactionRequest) {
    return this.wallet.sendTransaction(msgs);
  }

  async signIntentsWithAuth(domain: string, intents?: Record<string, any>[]) {
    const address = this.wallet.account?.address;
    if (!address) throw new Error("Wallet not connected");

    const seed = hex.encode(window.crypto.getRandomValues(new Uint8Array(32)));
    const msgBuffer = new TextEncoder().encode(`${domain}_${seed}`);
    const nonce = await window.crypto.subtle.digest("SHA-256", new Uint8Array(msgBuffer));
    const publicKey = await this.getPublicKey();

    return {
      signed: await this.signIntents(intents || [], { nonce: new Uint8Array(nonce) }),
      publicKey: `ed25519:${publicKey}`,
      chainId: WalletType.TON,
      address: address,
      seed,
    };
  }

  async signIntents(intents: Record<string, any>[], options?: { deadline?: number; nonce?: Uint8Array }) {
    const publicKey = await this.getPublicKey();
    const nonce = new Uint8Array(options?.nonce || window.crypto.getRandomValues(new Uint8Array(32)));
    const message = {
      deadline: new Date(Date.now() + 24 * 3_600_000 * 365).toISOString(),
      signer_id: await this.getIntentsAddress(),
      verifying_contract: "intents.near",
      nonce: base64.encode(nonce),
      intents,
    };

    const result = await this.wallet.signData({ text: JSON.stringify(message), type: "text" });

    return {
      ...result,
      standard: "ton_connect",
      signature: "ed25519:" + base58.encode(base64.decode(result.signature)),
      public_key: `ed25519:${publicKey}`,
    };
  }
}

export default TonWallet;
