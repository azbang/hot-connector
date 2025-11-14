import { sha256 } from "@noble/hashes/sha2.js";

import { AuthPopup } from "./popups/AuthIntentPopup";
import { AuthCommitment, OmniToken, OmniTokenMetadata, TokenBalance, TransferIntent } from "./types";
import { OmniConnector } from "./OmniConnector";
import Intents from "./Intents";

export enum WalletType {
  NEAR = 1010,
  EVM = 1,
  SOLANA = 1001,
  STELLAR = 1100,
  TON = 1111,
  PASSKEY = -10,
}

export interface SignedAuth {
  signed: Record<string, any>;
  address: string;
  publicKey: string;
  chainId: WalletType;
  seed: string;
}

export abstract class OmniWallet {
  constructor(readonly connector?: OmniConnector) {}

  abstract address: string;
  abstract publicKey?: string;
  abstract omniAddress: string;
  abstract type: WalletType;

  async disconnect({ silent = false }: { silent?: boolean } = {}) {
    if (!this.connector) throw new Error("Connector not implemented");
    await this.connector.disconnect({ silent });
  }

  abstract signIntentsWithAuth(domain: string, intents?: Record<string, any>[]): Promise<SignedAuth>;
  abstract signIntents(intents: Record<string, any>[], options?: { nonce?: Uint8Array; deadline?: number }): Promise<Record<string, any>>;

  async executeIntents(intents: Record<string, any>[], hashes: string[] = []) {
    const signed = await this.signIntents(intents);
    return await Intents.publishSignedIntents([signed], hashes);
  }

  async validateAuth(auth: AuthCommitment) {
    return true;
  }

  async transfer(args: { token: OmniToken; amount: number; to: string; paymentId: string }) {
    const int = Math.floor(args.amount * 10 ** OmniTokenMetadata[args.token].decimals);

    const intent: TransferIntent = {
      intent: "transfer",
      tokens: { [args.token]: int.toString() },
      receiver_id: args.to.toLowerCase(),
    };

    const nonce = new Uint8Array(sha256(new TextEncoder().encode(args.paymentId))).slice(0, 32);
    const signed = await this.signIntents([intent], { nonce });
    await Intents.publishSignedIntents([signed]);
  }

  async auth<T = SignedAuth>(domain: string, intents?: Record<string, any>[], then?: (signed: SignedAuth) => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const popup = new AuthPopup({
        type: this.type,
        onApprove: async () => {
          try {
            const signed = await this.signIntentsWithAuth(domain, intents);
            const result = await then?.(signed);
            resolve(result ?? (signed as T));
            popup.destroy();
          } catch (e) {
            reject(e);
            popup.destroy();
          }
        },

        onReject: () => {
          reject(new Error("User rejected"));
          popup.destroy();
        },
      });

      popup.create();
    });
  }

  async getAssets() {
    const assets = await Intents.getIntentsAssets(this.omniAddress);
    const balances = await Intents.getIntentsBalances(assets, this.omniAddress);
    return balances;
  }

  async getTokenBalances(tokens: OmniToken[]): Promise<TokenBalance[]> {
    const balances = await Intents.getIntentsBalances(tokens, this.omniAddress);

    return tokens.map((token) => {
      const metadata = OmniTokenMetadata[token];
      const icon = `https://storage.herewallet.app/ft/1010:${metadata.contractId}.png`;

      return {
        icon,
        int: balances[token] || 0n,
        id: metadata.contractId,
        float: Number(balances[token] || 0) / Math.pow(10, metadata.decimals),
        decimals: metadata.decimals,
        symbol: metadata.symbol,
      };
    });
  }

  async withdraw(args: { token: OmniToken; amount: number }) {
    // const token = OmniTokenMetadata[args.token];
    // await hotBridge.withdrawToken({
    //   chain: 1010,
    //   token: token.contractId,
    //   amount: BigInt(utils.parseAmount(args.amount, token.decimals)),
    //   intentAccount: await this.wallet.getIntentsAddress(),
    //   receiver: await this.wallet.getAddress(),
    //   signIntents: (t) => this.wallet!.signIntents(t),
    // });
  }
}
