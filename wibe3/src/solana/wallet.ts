import type { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { base64, base58, hex } from "@scure/base";

import { OmniWallet, WalletType } from "../OmniWallet";
import SolanaConnector from "./connector";

class SolanaWallet extends OmniWallet {
  constructor(readonly connector: SolanaConnector, readonly wallet: Wallet) {
    super(connector);
  }

  get type() {
    return WalletType.SOLANA;
  }

  async disconnect(data?: { silent?: boolean }) {
    const disconnect = (this.wallet.features as any)["standard:disconnect"]?.disconnect as (() => Promise<void>) | undefined;
    if (disconnect) await disconnect();
    super.disconnect(data);
  }

  async getAccount({ silent = false }: { silent?: boolean } = {}): Promise<WalletAccount> {
    let accounts = this.wallet.accounts || [];

    if (!accounts.length) {
      const connect = (this.wallet.features as any)["standard:connect"]?.connect;
      if (!connect) throw new Error("Wallet does not support standard:connect");
      const { accounts: connectedAccounts } = await connect({ silent });
      accounts = connectedAccounts || [];
    }

    if (!accounts.length) throw new Error("No account found");
    return accounts[0];
  }

  getAddress = async (): Promise<string> => {
    const account = await this.getAccount();
    return account.address;
  };

  getPublicKey = async (): Promise<string> => {
    const account = await this.getAccount();
    try {
      return base58.encode(account.publicKey as Uint8Array);
    } catch {
      return account.address;
    }
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

  async sendTransaction(transaction: Transaction | VersionedTransaction, connection: Connection, options?: any): Promise<string> {
    const account = await this.getAccount();
    const features = this.wallet.features as any;

    const signAndSend = features["solana:signAndSendTransaction"]?.signAndSendTransaction as
      | ((input: { account: WalletAccount; transaction: Transaction | VersionedTransaction }) => Promise<any>)
      | undefined;

    if (signAndSend) {
      const result = await signAndSend({ account, transaction });
      const signature = typeof result === "string" ? result : result?.signature ?? result;
      return typeof signature === "string" ? signature : base58.encode(signature as Uint8Array);
    }

    const signTx = features["solana:signTransaction"]?.signTransaction as
      | ((input: { account: WalletAccount; transaction: Transaction | VersionedTransaction }) => Promise<any>)
      | undefined;

    if (signTx) {
      const signed = await signTx({ account, transaction });
      const signedTx = (signed?.transaction ?? signed) as Transaction | VersionedTransaction | Uint8Array;
      const raw = signedTx instanceof Uint8Array ? signedTx : (signedTx as any).serialize();
      const sig = await connection.sendRawTransaction(raw as Uint8Array, options as any);
      return sig;
    }

    throw new Error("Wallet does not support Solana transaction signing");
  }

  async signMessage(message: string) {
    const account = await this.getAccount();
    const features = this.wallet.features as any;
    const signMessageFeature = features["solana:signMessage"]?.signMessage as
      | ((input: { account: WalletAccount; message: Uint8Array }) => Promise<any>)
      | undefined;

    if (!signMessageFeature) throw new Error("Wallet does not support solana:signMessage");
    const result = await signMessageFeature({ account, message: new TextEncoder().encode(message) });

    if (result instanceof Uint8Array) return result;
    if (result?.signature) return result.signature as Uint8Array;
    if (Array.isArray(result) && result[0]?.signature) return result[0].signature as Uint8Array;
    throw new Error("Unexpected signMessage result");
  }

  async signIntents(intents: Record<string, any>[], options?: { deadline?: number; nonce?: Uint8Array }): Promise<Record<string, any>> {
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
