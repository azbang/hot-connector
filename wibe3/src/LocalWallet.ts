import { KeyPair, KeyPairString } from "@near-js/crypto";
import { base58 } from "@scure/base";

import { OmniWallet, SignedAuth, WalletType } from "./OmniWallet";

class LocalWallet extends OmniWallet {
  #keyPair: KeyPair;

  constructor({ privateKey }: { privateKey: string }) {
    super();
    const key = privateKey.startsWith("ed25519:") ? (privateKey as KeyPairString) : `ed25519:${privateKey}`;
    this.#keyPair = KeyPair.fromString(key as KeyPairString);
  }

  get type(): WalletType {
    return WalletType.NEAR;
  }

  async getIntentsAddress(): Promise<string> {
    return Buffer.from(this.#keyPair.getPublicKey().data).toString("hex").toLowerCase();
  }

  async getAddress(): Promise<string> {
    return this.#keyPair.getPublicKey().toString().toLowerCase();
  }

  async getPublicKey(): Promise<string> {
    return this.#keyPair.getPublicKey().toString();
  }

  async signIntentsWithAuth(domain: string, intents?: Record<string, any>[]): Promise<SignedAuth> {
    throw new Error("Not implemented");
  }

  async signIntents(
    intents: Record<string, any>[],
    options?: { deadline?: number; nonce?: Uint8Array }
  ): Promise<Record<string, any>> {
    const nonce = new Uint8Array(options?.nonce || window.crypto.getRandomValues(new Uint8Array(32)));
    const signerId = await this.getIntentsAddress();

    const message = JSON.stringify({
      deadline: options?.deadline ? new Date(options.deadline).toISOString() : "2100-01-01T00:00:00.000Z",
      nonce: Buffer.from(nonce).toString("base64"),
      verifying_contract: "intents.near",
      signer_id: signerId,
      intents,
    });

    const signature = this.#keyPair.sign(Buffer.from(message)).signature;
    return {
      signature: `ed25519:${base58.encode(signature)}`,
      public_key: this.#keyPair.getPublicKey().toString(),
      standard: "raw_ed25519",
      payload: message,
    };
  }
}

export default LocalWallet;
