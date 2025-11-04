const ancestorOrigins = new Set([
  "http://localhost:1234",
  "https://my.herewallet.app",
  "https://tgapp-dev.herewallet.app",
  "https://tgapp.herewallet.app",
  "https://beta.herewallet.app",
  "https://app.hot-labs.org",
]);

export const isInjected = () => {
  if (typeof window === "undefined") return false;
  if (window.self === window.top) return false;
  return ancestorOrigins.has(window.location.ancestorOrigins?.[0]);
};

export const uuid4 = () => {
  try {
    return crypto.randomUUID();
  } catch {
    const temp_url = URL.createObjectURL(new Blob());
    const uuid = temp_url.toString();
    URL.revokeObjectURL(temp_url);
    return uuid.split(/[:/]/g).pop()!.toLowerCase(); // remove prefixes
  }
};

export const requestHot = (method: string, request: any) => {
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
