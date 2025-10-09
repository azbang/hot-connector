import { NearWallet } from "../../../near-connect/src";

export interface IPropsWalletAction {
  network: "testnet" | "mainnet";
  wallet: NearWallet;
}
