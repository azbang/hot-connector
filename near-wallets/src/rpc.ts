import { JsonRpcProvider } from "@near-js/providers";
import { getErrorTypeFromErrorMessage, parseRpcError } from "@near-js/utils";
import { TypedError } from "@near-js/types";

let _nextId = 123;

class NetworkError extends Error {
  constructor(status: number, title: string, message: string) {
    super(`${status} ${title}: ${message}`);
  }
}

class TimeoutNetworkError extends NetworkError {
  constructor(title: string) {
    super(0, title, "Timeout error");
  }
}

const wait = (timeout: number) => {
  return new Promise<void>((resolve) => setTimeout(resolve, timeout));
};

const c1 = Math.random() > 0.5;
export const rpcProviders = [
  "https://relmn.aurora.dev",
  "https://nearrpc.aurora.dev",
  c1 ? "https://c1.rpc.fastnear.com" : "https://c2.rpc.fastnear.com",
  c1 ? "https://c2.rpc.fastnear.com" : "https://c1.rpc.fastnear.com",
];

export class NearRpc extends JsonRpcProvider {
  public providers: string[];
  public currentProviderIndex = 0;
  public startTimeout;

  constructor(providers = rpcProviders, private timeout = 30_000, private triesCountForEveryProvider = 3, private incrementTimout = true) {
    super({ url: "" });
    this.currentProviderIndex = 0;
    this.providers = providers.length > 0 ? providers : rpcProviders;
    this.startTimeout = timeout;
  }

  async viewMethod(args: { contractId: string; methodName: string; args: any }) {
    const payload = Buffer.from(JSON.stringify(args.args), "utf8").toString("base64");
    const data: any = await this.query({
      args_base64: payload,
      finality: "optimistic",
      request_type: "call_function",
      method_name: args.methodName,
      account_id: args.contractId,
    });

    return JSON.parse(Buffer.from(data.result).toString("utf8"));
  }

  async sendJsonRpc<T>(method: string, params: any, attempts = 0): Promise<T> {
    const url = this.providers[this.currentProviderIndex];
    const requestStart = Date.now();

    try {
      const result = await this.send<T>(method, params, url, this.timeout);
      this.timeout = Math.max(this.startTimeout, this.timeout / 1.2);
      return result;
    } catch (error: any) {
      if (error instanceof TimeoutNetworkError && this.incrementTimout) {
        this.timeout = Math.min(60_000, this.timeout * 1.2);
      }

      if (error instanceof NetworkError) {
        this.currentProviderIndex += 1;
        if (this.providers[this.currentProviderIndex] == null) {
          this.currentProviderIndex = 0;
        }
        if (attempts + 1 > this.providers.length * this.triesCountForEveryProvider) {
          throw error;
        }

        const needTime = 500 * attempts;
        const spent = Date.now() - requestStart;

        if (spent < needTime) {
          await wait(needTime - spent);
        }
        return await this.sendJsonRpc(method, params, attempts + 1);
      }

      throw error;
    }
  }

  async send<T>(method: string, params: any, url: string, timeout: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const req = await fetch(url, {
      body: JSON.stringify({ method, params, id: _nextId++, jsonrpc: "2.0" }),
      headers: { "Content-Type": "application/json", Referer: "https://my.herewallet.app" },
      signal: controller.signal,
      method: "POST",
    }).catch(() => {
      clearInterval(timer);
      if (controller.signal.aborted) {
        throw new TimeoutNetworkError("RPC Network Error");
      }
      if (!window.navigator.onLine) {
        throw new NetworkError(0, "RPC Network Error", "No internet connection");
      }
      throw new NetworkError(0, "RPC Network Error", "Unknown Near RPC Error, maybe connection unstable, try VPN");
    });

    clearInterval(timer);
    if (!req.ok) {
      const text = await req.text().catch(() => "Unknown error");
      throw new NetworkError(req.status, "RPC Network Error", text);
    }

    const response = await req.json();

    if (response.error) {
      if (typeof response.error.data === "object") {
        const isReadable = typeof response.error.data.error_message === "string" && typeof response.error.data.error_type === "string";
        if (isReadable) {
          throw new TypedError(response.error.data.error_message, response.error.data.error_type);
        }
        throw parseRpcError(response.error.data);
      }

      // NOTE: All this hackery is happening because structured errors not implemented
      // TODO: Fix when https://github.com/nearprotocol/nearcore/issues/1839 gets resolved
      const errorMessage = `[${response.error.code}] ${response.error.message}: ${response.error.data}`;
      const isTimeout = response.error.data === "Timeout" || errorMessage.includes("Timeout error") || errorMessage.includes("query has timed out");

      if (isTimeout) {
        throw new TypedError(errorMessage, "TimeoutError");
      }
      const type = getErrorTypeFromErrorMessage(response.error.data, response.error.name);
      throw new TypedError(errorMessage, type);
    }

    return response.result;
  }
}

export const rpc = new NearRpc();
