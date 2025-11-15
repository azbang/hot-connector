import type { NearWalletBase } from "../types/wallet";
import type { Plugin, PluginResult } from "../types/plugin";

export class PluginManager {
  private plugins: Plugin[] = [];

  use(plugin: Plugin): void {
    this.plugins.push(plugin);
  }

  async executePluginChain<TArgs, TReturn>(
    methodName: keyof Plugin,
    wallet: NearWalletBase,
    args: TArgs,
    walletMethod: (args: TArgs) => Promise<TReturn>
  ): Promise<TReturn> {
    const executeChain = async (index: number, currentArgs: TArgs): Promise<TReturn> => {
      if (index >= this.plugins.length) {
        return walletMethod(currentArgs);
      }

      const plugin = this.plugins[index];
      const pluginHandler = plugin[methodName] as any;

      if (!pluginHandler) {
        return executeChain(index + 1, currentArgs);
      }

      const result = (value: TReturn): PluginResult<TReturn> => ({
        type: "result",
        value,
      });

      const next = async (newArgs: TArgs): Promise<TReturn> => {
        return executeChain(index + 1, newArgs);
      };

      const pluginResult = await pluginHandler.call(plugin, wallet, currentArgs, result, next);

      if (pluginResult.type === "result") {
        return pluginResult.value as TReturn;
      } else {
        return executeChain(index + 1, pluginResult.value);
      }
    };

    return executeChain(0, args);
  }

  getPlugins(): Plugin[] {
    return [...this.plugins];
  }

  clear(): void {
    this.plugins = [];
  }
}
