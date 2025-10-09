import { OmniWallet, WalletType } from "./OmniWallet";

export enum OmniToken {
  USDT = "nep141:usdt.tether-token.near",
  USDC = "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
}

export const OmniTokenMetadata: Record<OmniToken, { decimals: number; symbol: string; contractId: string }> = {
  [OmniToken.USDT]: { decimals: 6, symbol: "USDT", contractId: "usdt.tether-token.near" },
  [OmniToken.USDC]: {
    decimals: 6,
    symbol: "USDC",
    contractId: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  },
};

export interface AuthCommitment {
  tradingAddress: string;
  signed: Record<string, any>;
  address: string;
  publicKey: string;
  chainId: WalletType;
  seed: string;
}

export interface TransferIntent {
  intent: "transfer";
  tokens: Record<string, string>;
  receiver_id: string;
}

export interface TokenDiffIntent {
  type: "token_diff";
  token_diff: Record<string, string>;
}

export interface AuthCallIntent {
  type: "auth_call";
  msg: string;
}

export interface TokenBalance {
  id: string;
  int: bigint;
  float: number;
  decimals: number;
  symbol: string;
  icon: string;
}
