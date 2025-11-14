import type { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { base64, base58, hex } from "@scure/base";

import { OmniWallet, WalletType } from "../OmniWallet";
import SolanaConnector from "./connector";

class SolanaWebWallet extends OmniWallet {
  readonly type = WalletType.SOLANA;

  constructor(readonly connector: SolanaConnector, readonly address: string) {
    super(connector);
  }

  get publicKey() {
    return this.address;
  }

  get omniAddress() {
    return hex.encode(base58.decode(this.address)).toLowerCase();
  }

  async disconnect(data?: { silent?: boolean }) {
    super.disconnect(data);
  }

  async signIntentsWithAuth(domain: string, intents?: Record<string, any>[]) {
    const seed = hex.encode(window.crypto.getRandomValues(new Uint8Array(32)));
    const msgBuffer = new TextEncoder().encode(`${domain}_${seed}`);
    const nonce = await window.crypto.subtle.digest("SHA-256", new Uint8Array(msgBuffer));

    return {
      signed: await this.signIntents(intents || [], { nonce: new Uint8Array(nonce) }),
      publicKey: `ed25519:${this.address}`,
      chainId: WalletType.SOLANA,
      address: this.address,
      seed,
    };
  }

  async sendTransaction(transaction: Transaction | VersionedTransaction, connection: Connection, options?: any): Promise<string> {
    throw new Error("Not implemented");
  }

  async signMessage(message: string) {
    return new Uint8Array(0);
  }

  async signIntents(intents: Record<string, any>[], options?: { deadline?: number; nonce?: Uint8Array }): Promise<Record<string, any>> {
    const nonce = new Uint8Array(options?.nonce || window.crypto.getRandomValues(new Uint8Array(32)));

    const message = JSON.stringify({
      deadline: options?.deadline ? new Date(options.deadline).toISOString() : "2100-01-01T00:00:00.000Z",
      nonce: base64.encode(nonce),
      verifying_contract: "intents.near",
      signer_id: this.omniAddress,
      intents: intents,
    });

    const signature = await this.signMessage(message);
    return {
      signature: `ed25519:${base58.encode(signature)}`,
      public_key: `ed25519:${this.publicKey}`,
      standard: "raw_ed25519",
      payload: message,
    };
  }
}

export default SolanaWebWallet;
