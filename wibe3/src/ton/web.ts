import { SendTransactionRequest } from "@tonconnect/ui";
import { base58, base64, hex } from "@scure/base";

import { OmniWallet, WalletType } from "../OmniWallet";
import TonConnector from "./connector";

class TonWebWallet extends OmniWallet {
  readonly type = WalletType.TON;

  constructor(readonly connector: TonConnector, readonly address: string, readonly publicKey: string) {
    super(connector);
  }

  get omniAddress() {
    return this.publicKey.toLowerCase();
  }

  async sendTransaction(msgs: SendTransactionRequest) {
    throw new Error("Not implemented");
  }

  async signIntentsWithAuth(domain: string, intents?: Record<string, any>[]) {
    const seed = hex.encode(window.crypto.getRandomValues(new Uint8Array(32)));
    const msgBuffer = new TextEncoder().encode(`${domain}_${seed}`);
    const nonce = await window.crypto.subtle.digest("SHA-256", new Uint8Array(msgBuffer));

    return {
      signed: await this.signIntents(intents || [], { nonce: new Uint8Array(nonce) }),
      publicKey: `ed25519:${this.publicKey}`,
      chainId: WalletType.TON,
      address: this.address,
      seed,
    };
  }

  async signMessage(message: string): Promise<Record<string, any>> {
    throw new Error("Not implemented");
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

    const result = await this.signMessage(JSON.stringify(message));

    return {
      ...result,
      standard: "ton_connect",
      signature: "ed25519:" + base58.encode(base64.decode(result.signature)),
      public_key: `ed25519:${this.publicKey}`,
    };
  }
}

export default TonWebWallet;
