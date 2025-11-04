import { isInjected, requestHot } from "./hot";

class HotEvmProvider {
  _events = new Map<string, Set<any>>();
  isConnected = () => true;
  isHotWallet = true;
  isMetaMask = true;

  request = (request: any) => requestHot("ethereum", request);
  removeListener() {}
  on() {}
}

if (isInjected()) {
  const hotProvider = new HotEvmProvider();
  function announceProvider() {
    // @ts-ignore
    window.ethereum = undefined;
    // @ts-ignore
    window.ethereum = hotProvider as any;
    window?.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({
          provider: hotProvider,
          info: {
            icon: "https://storage.herewallet.app/logo.png",
            rdns: "org.hot-labs",
            uuid: "cc8e962c-1f42-425c-8845-e8bd2e136fff",
            name: "HOT Wallet",
          },
        }),
      })
    );
  }

  window.addEventListener("eip6963:requestProvider", () => announceProvider());
  announceProvider();
}
