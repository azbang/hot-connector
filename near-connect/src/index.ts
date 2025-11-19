export { type DataStorage, LocalStorage } from "./helpers/storage";
export { ParentFrameWallet } from "./ParentFrameWallet";
export { SandboxWallet } from "./SandboxedWallet";
export { InjectedWallet } from "./InjectedWallet";
export { NearConnector } from "./NearConnector";

export type {
  NearWalletBase,
  WalletManifest,
  EventNearWalletInjected,
  SignInParams,
  SignMessageParams,
  SignedMessage,
  SignAndSendTransactionParams,
  SignAndSendTransactionsParams,
} from "./types/wallet";

export type {
  Plugin,
  PluginResult,
  PluginResultFn,
  PluginNextFn,
  PluginContext,
} from "./types/plugin";

export { createResult, createNext } from "./types/plugin";

export * as tx from "./types/transactions";
