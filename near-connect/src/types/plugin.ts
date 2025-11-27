import { NearWalletBase } from "./wallet";

export type WalletPlugin = (wallet: NearWalletBase) => NearWalletBase & Record<string, any>