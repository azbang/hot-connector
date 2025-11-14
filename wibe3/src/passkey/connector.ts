import { base58 } from "@scure/base";

import { LocalStorage } from "../storage";
import { OmniConnector } from "../OmniConnector";
import { PasskeyPopup } from "../popups/PasskeyPopup";
import { WalletType } from "../OmniWallet";

import { createNew, getRelayingPartyId } from "./service";
import PasskeyWallet from "./wallet";

class PasskeyConnector extends OmniConnector<PasskeyWallet> {
  storage = new LocalStorage();

  icon = "https://near-intents.org/static/icons/wallets/webauthn.svg";
  type = WalletType.PASSKEY;
  name = "Passkey";
  id = "passkey";

  constructor() {
    super();

    this.storage.get("passkey:connected").then((data) => {
      if (data) this.setWallet(new PasskeyWallet(this, JSON.parse(data)));
    });
  }

  get isSupported() {
    return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";
  }

  connectWebWallet() {}

  async connectNew(nickname?: string) {
    const credential = await createNew(nickname);
    await this.retryOperation(async () => {
      const response = await fetch(`https://dev.herewallet.app/api/v1/hot/passkey_public_key`, {
        body: JSON.stringify({ public_key: credential.publicKey, raw_id: credential.rawId, hostname: getRelayingPartyId() }),
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to create new passkey");
    });

    this.storage.set("passkey:connected", JSON.stringify(credential));
    const wallet = new PasskeyWallet(this, credential);
    this.setWallet(wallet);
    return wallet;
  }

  async connectExisting() {
    const rawId = await this.signIn();
    if (!rawId) throw new Error("Failed to get passkey raw id");

    return await this.retryOperation(async () => {
      const response = await fetch(`https://dev.herewallet.app/api/v1/hot/passkey_public_key?raw_id=${rawId}`, { method: "GET" });
      if (!response.ok) throw new Error("Failed to get passkey public key");

      const { public_key } = await response.json();
      this.storage.set("passkey:connected", JSON.stringify({ public_key: public_key, raw_id: rawId }));
      const wallet = new PasskeyWallet(this, { publicKey: public_key, rawId });
      this.setWallet(wallet);
      return wallet;
    });
  }

  async connect() {
    if (!this.isSupported) throw new Error("Passkey is not supported");

    let popup!: PasskeyPopup;
    await new Promise<PasskeyWallet>((resolve, reject) => {
      popup = new PasskeyPopup({
        onLogin: () => this.connectExisting().then(resolve).catch(reject),
        onCreate: (nickname?: string) => this.connectNew(nickname).then(resolve).catch(reject),
        onReject: () => reject(new Error("Passkey connection rejected")),
      });

      popup.create();
    });

    popup?.destroy();
  }

  async signIn(): Promise<string | null> {
    const assertion = await navigator.credentials.get({
      publicKey: {
        rpId: getRelayingPartyId(),
        challenge: new Uint8Array(32),
        allowCredentials: [],
        timeout: 60000,
      },
    });

    if (assertion == null || assertion.type !== "public-key") return null;
    const credential = assertion as PublicKeyCredential;
    return base58.encode(new Uint8Array(credential.rawId));
  }

  async silentDisconnect() {
    this.storage.remove("passkey:connected");
  }

  async retryOperation<T>(operation: () => Promise<T>, maxRetries = 10, delay = 1000): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new Error("Operation failed after max retries");
  }
}

export default PasskeyConnector;
