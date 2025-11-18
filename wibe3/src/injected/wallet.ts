import { GlobalSettings } from "../HotConnector";
import { uuid4 } from "./hot";

export const requestWebWallet = (chain?: number, address?: string) => (method: string, request: any) => {
  const width = 480;
  const height = 640;
  const wallet = GlobalSettings.webWallet;
  const x = (window.screen.width - width) / 2;
  const y = (window.screen.height - height) / 2;

  const popup = window.open(`${wallet}`, "_blank", `popup=1,width=${width},height=${height},top=${y},left=${x}`);

  return new Promise<any>(async (resolve, reject) => {
    const interval = setInterval(() => {
      if (!popup?.closed) return;
      clearInterval(interval);
      reject(new Error("User rejected"));
    }, 100);

    const id = uuid4();
    const handler = (event: MessageEvent) => {
      if (event.origin !== wallet) return;

      if (event.data === "hot:ready") {
        popup?.postMessage({ chain, address, method, request, id }, "*");
        return;
      }

      if (event.data.id !== id) return;
      if (event.data.success === false) {
        clearInterval(interval);
        reject(new Error(event.data.payload));
        window.removeEventListener("message", handler);
      }

      window.removeEventListener("message", handler);
      resolve(event.data.payload);
      clearInterval(interval);
      popup?.close();
    };

    window.addEventListener("message", handler);
  });
};
