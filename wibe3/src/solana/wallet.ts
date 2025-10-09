import type { SendTransactionOptions } from "@reown/appkit-adapter-solana";
import type { AppKit } from "@reown/appkit";
import type { Provider as SolanaProvider } from "@reown/appkit-utils/solana";
import type { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { base64, base58, hex } from "@scure/base";

import { OmniWallet, WalletType } from "../OmniWallet";
import SolanaConnector from "./connector";

class SolanaWallet extends OmniWallet {
  constructor(readonly connector: SolanaConnector, readonly wallet: SolanaProvider) {
    super(connector);
  }

  get type() {
    return WalletType.SOLANA;
  }

  getAddress = async (): Promise<string> => {
    const addresses = await this.wallet.getAccounts();
    if (addresses.length === 0) throw new Error("No account found");
    return addresses[0].address;
  };

  getPublicKey = async (): Promise<string> => {
    return this.getAddress();
  };

  getIntentsAddress = async (): Promise<string> => {
    const address = await this.getAddress();
    return hex.encode(base58.decode(address)).toLowerCase();
  };

  async signIntentsWithAuth(domain: string, intents?: Record<string, any>[]) {
    const address = await this.getAddress();
    const seed = hex.encode(window.crypto.getRandomValues(new Uint8Array(32)));
    const msgBuffer = new TextEncoder().encode(`${domain}_${seed}`);
    const nonce = await window.crypto.subtle.digest("SHA-256", new Uint8Array(msgBuffer));

    return {
      signed: await this.signIntents(intents || [], { nonce: new Uint8Array(nonce) }),
      publicKey: `ed25519:${address}`,
      chainId: WalletType.SOLANA,
      address: address,
      seed,
    };
  }

  async sendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    options?: SendTransactionOptions
  ): Promise<string> {
    return await this.wallet.sendTransaction(transaction, connection, options);
  }

  async signMessage(message: string) {
    return await this.wallet.signMessage(new TextEncoder().encode(message));
  }

  async signIntents(
    intents: Record<string, any>[],
    options?: { deadline?: number; nonce?: Uint8Array }
  ): Promise<Record<string, any>> {
    const nonce = new Uint8Array(options?.nonce || window.crypto.getRandomValues(new Uint8Array(32)));
    const signerId = await this.getIntentsAddress();
    const publicKey = await this.getPublicKey();

    const message = JSON.stringify({
      deadline: options?.deadline ? new Date(options.deadline).toISOString() : "2100-01-01T00:00:00.000Z",
      nonce: base64.encode(nonce),
      verifying_contract: "intents.near",
      signer_id: signerId,
      intents: intents,
    });

    const signature = await this.signMessage(message);
    return {
      signature: `ed25519:${base58.encode(signature)}`,
      public_key: `ed25519:${publicKey}`,
      standard: "raw_ed25519",
      payload: message,
    };
  }
}

export default SolanaWallet;
