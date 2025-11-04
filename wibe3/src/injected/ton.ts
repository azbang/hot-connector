import { isInjected, requestHot } from "./hot";

if (isInjected()) {
  // @ts-ignore
  window.hotWallet = {
    tonconnect: {
      deviceInfo: {
        appName: "hot",
        appVersion: "1",
        maxProtocolVersion: 2,
        platform: "ios",
        features: [
          "SendTransaction",
          {
            name: "SendTransaction",
            maxMessages: 255,
            extraCurrencySupported: false,
          },
          {
            name: "SignData",
            types: ["text", "binary", "cell"],
          },
        ],
      },

      walletInfo: {
        name: "hotWallet",
        image: "https://storage.herewallet.app/logo.png",
        about_url: "https://hot-labs.org",
      },

      protocolVersion: 2,
      isWalletBrowser: true,

      connect: (_: number, request: any) => {
        return requestHot("ton:connect", request);
      },

      restoreConnection: () => {
        return requestHot("ton:restoreConnection", {});
      },

      disconnect: () => {
        return requestHot("ton:disconnect", {});
      },

      send: async (request: any) => {
        return requestHot("ton:send", request);
      },

      listen: () => {
        return function () {};
      },
    },
  };
}
