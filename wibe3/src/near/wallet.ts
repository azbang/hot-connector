import type { FinalExecutionOutcome } from "@near-wallet-selector/core";
import { base64, base58, hex } from "@scure/base";

import {
  NearWalletBase,
  SignAndSendTransactionsParams,
  SignMessageParams,
  SignedMessage,
  SignInParams,
  SignAndSendTransactionParams,
} from "@hot-labs/near-connect";

import { OmniWallet, WalletType } from "../OmniWallet";
import NearConnector from "./connector";

type Account = {
  accountId: string;
  publicKey: string;
};

type Network = "mainnet" | "testnet";

export default class NearWallet extends OmniWallet {
  constructor(readonly connector: NearConnector, readonly wallet: NearWalletBase) {
    super(connector);
  }

  get type(): WalletType {
    return WalletType.NEAR;
  }

  get manifest() {
    return this.wallet.manifest;
  }

  async onDisconnect() {
    this.wallet.signOut();
  }

  async signIn(params: SignInParams): Promise<Array<Account>> {
    return this.wallet.signIn(params);
  }

  async signOut(data?: { network?: Network }): Promise<void> {
    return this.wallet.signOut(data);
  }

  async getAccounts(data?: { network?: Network }): Promise<Array<Account>> {
    return this.wallet.getAccounts(data);
  }

  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<FinalExecutionOutcome> {
    return this.wallet.signAndSendTransaction(params);
  }

  async signAndSendTransactions(params: SignAndSendTransactionsParams): Promise<Array<FinalExecutionOutcome>> {
    return this.wallet.signAndSendTransactions(params);
  }

  async signMessage(params: SignMessageParams): Promise<SignedMessage> {
    return this.wallet.signMessage(params);
  }

  async getAddress(): Promise<string> {
    const accounts = await this.wallet.getAccounts();
    if (accounts.length === 0) throw new Error("No account found");
    return accounts[0].accountId;
  }

  async getPublicKey(): Promise<string> {
    const accounts = await this.wallet.getAccounts();
    if (accounts.length === 0) throw new Error("No account found");
    return accounts[0].publicKey;
  }

  async getIntentsAddress(): Promise<string> {
    return await this.getAddress();
  }

  async signIntentsWithAuth(domain: string, intents?: Record<string, any>[]) {
    const accounts = await this.wallet.getAccounts();
    if (accounts.length === 0) throw new Error("No account found");
    const { accountId, publicKey } = accounts[0];

    const seed = hex.encode(window.crypto.getRandomValues(new Uint8Array(32)));
    const msgBuffer = new TextEncoder().encode(`${domain}_${seed}`);
    const nonce = await window.crypto.subtle.digest("SHA-256", new Uint8Array(msgBuffer));

    return {
      signed: await this.signIntents(intents || [], { nonce: new Uint8Array(nonce) }),
      chainId: WalletType.NEAR,
      publicKey: publicKey,
      address: accountId,
      domain,
      seed,
    };
  }

  async signIntents(
    intents: Record<string, any>[],
    options?: { nonce?: Uint8Array; deadline?: number }
  ): Promise<Record<string, any>> {
    const nonce = new Uint8Array(options?.nonce || window.crypto.getRandomValues(new Uint8Array(32)));
    const signerId = await this.getIntentsAddress();

    const message = JSON.stringify({
      deadline: options?.deadline ? new Date(options.deadline).toISOString() : "2100-01-01T00:00:00.000Z",
      signer_id: signerId,
      intents: intents,
    });

    const result = await this.wallet.signMessage({ message, recipient: "intents.near", nonce });
    if (!result) throw new Error("Failed to sign message");
    const { signature, publicKey } = result;

    return {
      standard: "nep413",
      payload: { nonce: base64.encode(nonce), recipient: "intents.near", message },
      signature: signature.includes("ed25519:") ? signature : `ed25519:${base58.encode(base64.decode(signature))}`,
      public_key: publicKey,
    };
  }
}
