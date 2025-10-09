import { base64, base58, hex, base32 } from "@scure/base";

import { OmniWallet, WalletType } from "../OmniWallet";
import StellarConnector from "./connector";

class StellarWallet extends OmniWallet {
  constructor(readonly connector: StellarConnector, readonly address: string) {
    super(connector);
    this.address = address;
  }

  get type() {
    return WalletType.STELLAR;
  }

  getAddress = async (): Promise<string> => {
    return this.address;
  };

  getPublicKey = async (): Promise<string> => {
    const payload = base32.decode(this.address);
    return base58.encode(payload.slice(1, -2));
  };

  getIntentsAddress = async (): Promise<string> => {
    const payload = base32.decode(this.address);
    return hex.encode(payload.slice(1, -2));
  };

  async signIntentsWithAuth(domain: string, intents?: Record<string, any>[]) {
    const address = await this.getAddress();
    const publicKey = await this.getPublicKey();
    const seed = hex.encode(window.crypto.getRandomValues(new Uint8Array(32)));
    const msgBuffer = new TextEncoder().encode(`${domain}_${seed}`);
    const nonce = await window.crypto.subtle.digest("SHA-256", new Uint8Array(msgBuffer));

    return {
      signed: await this.signIntents(intents || [], { nonce: new Uint8Array(nonce) }),
      publicKey: `ed25519:${publicKey}`,
      chainId: WalletType.STELLAR,
      address: address,
      seed,
    };
  }

  async signMessage(message: string) {
    return await this.connector.stellarKit.signMessage(message);
  }

  async signIntents(
    intents: Record<string, any>[],
    options?: { deadline?: number; nonce?: Uint8Array }
  ): Promise<Record<string, any>> {
    const nonce = new Uint8Array(options?.nonce || window.crypto.getRandomValues(new Uint8Array(32)));
    const signerId = await this.getIntentsAddress();
    const publicKey = await this.getPublicKey();

    const message = JSON.stringify({
      deadline: options?.deadline ? new Date(options.deadline).toISOString() : "2100-01-01T00:00:00.000Z",
      nonce: base64.encode(nonce),
      verifying_contract: "intents.near",
      signer_id: signerId,
      intents: intents,
    });

    const signature = await this.signMessage(message);

    return {
      signature: `ed25519:${base58.encode(base64.decode(signature.signedMessage))}`,
      public_key: `ed25519:${publicKey}`,
      standard: "sep53",
      payload: message,
    };
  }
}

export default StellarWallet;
