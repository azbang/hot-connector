import { OmniConnector } from "../OmniConnector";
import { WalletType } from "../OmniWallet";
import PasskeyWallet from "./wallet";
import { LocalStorage } from "../../../near-connect/src/helpers/storage";
import { createNew } from "./service";

class PasskeyConnector extends OmniConnector<PasskeyWallet> {
  type = WalletType.PASSKEY;
  storage = new LocalStorage();
  icon = "https://near-intents.org/static/icons/wallets/webauthn.svg";
  name = "Passkey";
  id = "passkey";

  constructor() {
    super();

    this.storage.get("passkey-wallet").then((data) => {
      if (data) this.setWallet(new PasskeyWallet(this, JSON.parse(data)));
    });
  }

  get isSupported() {
    return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";
  }

  async connect() {
    const credential = await createNew();
    this.storage.set("passkey-wallet", JSON.stringify(credential));
    this.setWallet(new PasskeyWallet(this, credential));
  }

  async silentDisconnect() {
    this.storage.remove("passkey-wallet");
  }
}

export default PasskeyConnector;
