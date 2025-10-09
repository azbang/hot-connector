import { AppKit } from "@reown/appkit";
import { Provider as EvmProvider } from "@reown/appkit-utils/ethers";
import { OmniConnector } from "../OmniConnector";
import EvmAccount from "./wallet";
import { WalletType } from "../OmniWallet";
import { getOrCreateAppKit } from "./reown";

class EvmConnector extends OmniConnector<EvmAccount> {
  appKit: AppKit;
  type = WalletType.EVM;
  isSupported = true;
  chainId = 1;
  id = "eip155";

  name = "EVM Wallet";
  icon = "https://storage.herewallet.app/ft/1:native.png";

  constructor(appKit?: AppKit) {
    super();

    this.appKit = appKit || getOrCreateAppKit();
    this.appKit.subscribeProviders(async (state) => {
      const evmProvider = state["eip155"] as EvmProvider;
      if (evmProvider) this.setWallet(new EvmAccount(this, evmProvider));
      else this.removeWallet();
    });
  }

  async connect() {
    this.appKit.open({ namespace: "eip155" });
  }

  async silentDisconnect() {
    this.appKit.disconnect("eip155");
  }
}

export default EvmConnector;
