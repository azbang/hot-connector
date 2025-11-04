import { Transaction, VersionedTransaction } from "@solana/web3.js";
import type { IdentifierString } from "@wallet-standard/base";

interface Indexed<T> {
  length: number;
  [index: number]: T;
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return arraysEqual(a, b);
}

export function arraysEqual<T>(a: Indexed<T>, b: Indexed<T>): boolean {
  if (a === b) return true;

  const length = a.length;
  if (length !== b.length) return false;

  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

export const GhostNamespace = "hot:";
export type GhostFeature = { [GhostNamespace]: { ghost: any } };

/** Solana Mainnet (beta) cluster, e.g. https://api.mainnet-beta.solana.com */
export const SOLANA_MAINNET_CHAIN = "solana:mainnet";

/** Solana Devnet cluster, e.g. https://api.devnet.solana.com */
export const SOLANA_DEVNET_CHAIN = "solana:devnet";

/** Solana Testnet cluster, e.g. https://api.testnet.solana.com */
export const SOLANA_TESTNET_CHAIN = "solana:testnet";

/** Solana Localnet cluster, e.g. http://localhost:8899 */
export const SOLANA_LOCALNET_CHAIN = "solana:localnet";

/** Array of all Solana clusters */
export const SOLANA_CHAINS = ["solana:mainnet", "solana:mainnet-beta"] as const;

/** Type of all Solana clusters */
export type SolanaChain = (typeof SOLANA_CHAINS)[number];

/**
 * Check if a chain corresponds with one of the Solana clusters.
 */
export function isSolanaChain(chain: IdentifierString): chain is SolanaChain {
  return SOLANA_CHAINS.includes(chain as SolanaChain);
}

export function isVersionedTransaction(transaction: Transaction | VersionedTransaction): transaction is VersionedTransaction {
  return "version" in transaction;
}
