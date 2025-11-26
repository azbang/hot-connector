import type { NearWalletBase } from "../types/wallet";
import { PluginManager } from "./plugin-manager";

export function createWalletProxy(wallet: NearWalletBase, pluginManager: PluginManager): NearWalletBase {
  return new Proxy(wallet, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Always return the manifest property directly
      if (prop === "manifest") {
        return value;
      }

      // If it's a function on the wallet, wrap it with plugin chain
      if (typeof value === "function") {
        return async function (...args: any[]) {
          const methodName = String(prop);
          return await pluginManager.executePluginChain(
            methodName,
            target,
            args[0],
            (params) => value.apply(target, [params])
          );
        };
      }

      // If the property doesn't exist (undefined) and it's a string property name,
      // return a function so plugins can implement it
      if (value === undefined && typeof prop === "string") {
        return async function (...args: any[]) {
          const methodName = String(prop);
          return await pluginManager.executePluginChain(
            methodName,
            target,
            args[0],
            null // No wallet method exists, plugins must handle it
          );
        };
      }

      // Return other properties as-is (e.g., data properties)
      return value;
    },
  }) as NearWalletBase;
}
