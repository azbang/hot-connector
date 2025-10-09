import { OmniConnector } from "../OmniConnector";
import { WalletType } from "../OmniWallet";
import PasskeyWallet from "./wallet";

class PasskeyConnector extends OmniConnector<PasskeyWallet> {
  type = WalletType.PASSKEY;
  chainId = 1;
  name = "Passkey";
  icon = "https://storage.herewallet.app/ft/-10:native.png";
  id = "passkey";

  get isSupported() {
    return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";
  }

  async connect() {
    throw new Error("Method not implemented.");
  }

  async silentDisconnect() {
    throw new Error("Method not implemented.");
  }
}

export default PasskeyConnector;
