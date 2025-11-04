const ancestorOrigins = new Set([
  "http://localhost:1234",
  "https://my.herewallet.app",
  "https://tgapp-dev.herewallet.app",
  "https://tgapp.herewallet.app",
  "https://beta.herewallet.app",
  "https://app.hot-labs.org",
]);

const logo =
  "data:image/png;base64,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";

const isInjected = () => {
  if (typeof window === "undefined") return false;
  if (window.self === window.top) return false;
  return ancestorOrigins.has(window.location.ancestorOrigins?.[0]);
};

const uuid4 = () => {
  try {
    return crypto.randomUUID();
  } catch {
    const temp_url = URL.createObjectURL(new Blob());
    const uuid = temp_url.toString();
    URL.revokeObjectURL(temp_url);
    return uuid.split(/[:/]/g).pop()!.toLowerCase(); // remove prefixes
  }
};

const requestHot = (method: string, request: any) => {
  const id = uuid4();
  return new Promise<any>((resolve, reject) => {
    const handler = (e: any) => {
      if (e.data.id !== id) return;
      window?.removeEventListener("message", handler);
      return e.data.success ? resolve(e.data.payload) : reject(e.data.payload);
    };

    window?.parent.postMessage({ $hot: true, method, request, id }, "*");
    window?.addEventListener("message", handler);
  });
};

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
    window.ethereum = undefined;
    window.ethereum = hotProvider as any;
    window?.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({
          provider: hotProvider,
          info: {
            icon: logo,
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
