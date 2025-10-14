import { keccak_256 } from "@noble/hashes/sha3.js";
import { base58, base64, base64url, hex } from "@scure/base";

import { OmniWallet, WalletType } from "../OmniWallet";
import { extractRawSignature, parsePublicKey } from "./utils";
import { signMessage, WebauthnCredential } from "./service";
import PasskeyConnector from "./connector";

class PasskeyWallet extends OmniWallet {
  constructor(readonly connector: PasskeyConnector, readonly credential: WebauthnCredential) {
    super(connector);
  }

  get type() {
    return WalletType.PASSKEY;
  }

  getAddress = async (): Promise<string> => {
    const { curveType, publicKey } = parsePublicKey(this.credential.publicKey);

    switch (curveType) {
      case "p256": {
        const p256 = new TextEncoder().encode("p256");
        const addressBytes = keccak_256(new Uint8Array([...p256, ...publicKey])).slice(-20);
        return "0x" + hex.encode(addressBytes);
      }

      case "ed25519": {
        return hex.encode(publicKey);
      }

      default:
        curveType satisfies never;
        throw new Error("Unsupported curve type");
    }
  };

  getPublicKey = async (): Promise<string> => {
    return this.credential.publicKey;
  };

  getIntentsAddress = async (): Promise<string> => {
    return this.getAddress();
  };

  async signIntentsWithAuth(domain: string, intents?: Record<string, any>[]) {
    const seed = hex.encode(window.crypto.getRandomValues(new Uint8Array(32)));
    const msgBuffer = new TextEncoder().encode(`${domain}_${seed}`);
    const nonce = await window.crypto.subtle.digest("SHA-256", new Uint8Array(msgBuffer));

    const publicKey = await this.getPublicKey();
    const address = await this.getAddress();

    return {
      signed: await this.signIntents(intents || [], { nonce: new Uint8Array(nonce) }),
      publicKey: `p256:${publicKey}`,
      chainId: WalletType.NEAR,
      address,
      seed,
    };
  }

  async signIntents(intents: Record<string, any>[], options?: { deadline?: number; nonce?: Uint8Array }): Promise<Record<string, any>> {
    const nonceArr = options?.nonce || window.crypto.getRandomValues(new Uint8Array(32));
    const signerId = await this.getIntentsAddress();
    const publicKey = await this.getPublicKey();

    const message = JSON.stringify({
      deadline: options?.deadline ? new Date(options.deadline).toISOString() : "2100-01-01T00:00:00.000Z",
      nonce: base64.encode(nonceArr),
      verifying_contract: "intents.near",
      signer_id: signerId,
      intents,
    });

    const challenge = await crypto.subtle.digest("SHA-256", new Uint8Array(new TextEncoder().encode(message)));
    const signed = await signMessage(challenge, this.credential);
    const { curveType } = parsePublicKey(this.credential.publicKey);

    return {
      standard: "webauthn",
      payload: message,
      public_key: publicKey,
      signature: `p256:${base58.encode(extractRawSignature(signed.signature, curveType))}`,
      authenticator_data: base64url.encode(new Uint8Array(signed.authenticatorData)),
      client_data_json: new TextDecoder().decode(signed.clientDataJSON),
    };
  }
}

export default PasskeyWallet;
