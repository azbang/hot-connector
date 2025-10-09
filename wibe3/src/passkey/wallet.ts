import { keccak_256 } from "@noble/hashes/sha3.js";
import { base64, hex } from "@scure/base";

import { DataStorage, LocalStorage } from "../../../near-connect/src/helpers/storage";
import { OmniWallet, WalletType } from "../OmniWallet";
import { parsePublicKey } from "./utils";

type StoredPasskey = {
  credentialId: string; // base64url (older versions stored hex; we support both when reading)
  publicKeyJwk: JsonWebKey; // ES256 (P-256)
};

class PasskeyWallet extends OmniWallet {
  private storage: DataStorage;
  private rpId: string;

  constructor({ storage, rpId }: { storage?: DataStorage; rpId?: string } = {}) {
    super();

    this.storage = storage || new LocalStorage();
    this.rpId = rpId || (typeof location !== "undefined" ? location.hostname : "localhost");
  }

  get type() {
    return WalletType.PASSKEY;
  }

  async onDisconnect() {
    this.storage.remove("passkey");
  }

  getAddress = async (): Promise<string> => {
    // @ts-ignore
    const { curveType, publicKey } = parsePublicKey(this.credential);

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
    return "";
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

  async signIntents(
    intents: Record<string, any>[],
    options?: { deadline?: number; nonce?: Uint8Array }
  ): Promise<Record<string, any>> {
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

    // @ts-ignore
    const signed = await this.webauthnSign(challenge);

    return {
      standard: "webauthn",
      payload: message,
      public_key: `p256:${publicKey}`,
      signature: `p256:${signed.signature}`,
      authenticator_data: signed.authenticatorData,
      client_data_json: new TextDecoder().decode(signed.clientDataJSON),
    };
  }
}

export default PasskeyWallet;
