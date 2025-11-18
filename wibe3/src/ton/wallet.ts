import { SendTransactionRequest, SignDataPayload, SignDataResponse } from "@tonconnect/ui";
import { toUserFriendlyAddress } from "@tonconnect/ui";
import { base58, base64, hex } from "@scure/base";

import { OmniWallet, WalletType } from "../OmniWallet";
import TonConnector from "./connector";

interface ProtocolWallet {
  sendTransaction: (params: SendTransactionRequest) => Promise<any>;
  signData: (params: SignDataPayload) => Promise<SignDataResponse>;
  account: { address: string; publicKey?: string };
}

class TonWallet extends OmniWallet {
  readonly type = WalletType.TON;

  constructor(readonly connector: TonConnector, readonly wallet: ProtocolWallet) {
    super(connector);
  }

  get address() {
    if (!this.wallet.account) throw new Error("No account found");
    return toUserFriendlyAddress(this.wallet.account.address);
  }

  get publicKey() {
    if (!this.wallet.account?.publicKey) throw new Error("No public key found");
    return base58.encode(hex.decode(this.wallet.account.publicKey));
  }

  get omniAddress() {
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

    return {
      signed: await this.signIntents(intents || [], { nonce: new Uint8Array(nonce) }),
      publicKey: `ed25519:${this.publicKey}`,
      chainId: WalletType.TON,
      address: address,
      seed,
    };
  }

  async signIntents(intents: Record<string, any>[], options?: { deadline?: number; nonce?: Uint8Array }) {
    const nonce = new Uint8Array(options?.nonce || window.crypto.getRandomValues(new Uint8Array(32)));
    const message = {
      deadline: new Date(Date.now() + 24 * 3_600_000 * 365).toISOString(),
      signer_id: this.omniAddress,
      verifying_contract: "intents.near",
      nonce: base64.encode(nonce),
      intents,
    };

    const result = await this.wallet.signData({ text: JSON.stringify(message), type: "text" });

    return {
      ...result,
      standard: "ton_connect",
      signature: "ed25519:" + base58.encode(base64.decode(result.signature)),
      public_key: `ed25519:${this.publicKey}`,
    };
  }
}

export default TonWallet;
