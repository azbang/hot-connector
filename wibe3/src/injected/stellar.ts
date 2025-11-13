import { type ModuleInterface, ModuleType, WalletNetwork } from "@creit.tech/stellar-wallets-kit";
import { requestHot } from "./hot";

export const HOTWALLET_ID: string = "hot-wallet";

/**
 * **IMPORTANT**: This module requires that you have a "global" and a "Buffer" polyfill in your app, if not provided then this module will break your app.
 */
export class HotWalletModule implements ModuleInterface {
  moduleType: ModuleType = ModuleType.HOT_WALLET;
  productId: string = HOTWALLET_ID;
  productName: string = "HOT Wallet";
  productUrl: string = "https://hot-labs.org/wallet";
  productIcon: string = "https://storage.herewallet.app/logo.png";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getAddress(): Promise<{ address: string }> {
    return await requestHot("stellar:getAddress", {});
  }

  async signTransaction(xdr: string, opts?: { address?: string }): Promise<{ signedTxXdr: string; signerAddress?: string }> {
    return await requestHot("stellar:signTransaction", { xdr, accountToSign: opts?.address });
  }

  async signAuthEntry(authEntry: string, opts?: { address?: string }): Promise<{ signedAuthEntry: string; signerAddress?: string }> {
    return await requestHot("stellar:signAuthEntry", { authEntry, accountToSign: opts?.address });
  }

  async signMessage(message: string, opts?: { address?: string }): Promise<{ signedMessage: string; signerAddress?: string }> {
    return await requestHot("stellar:signMessage", { message, accountToSign: opts?.address });
  }

  async getNetwork(): Promise<{ network: string; networkPassphrase: string }> {
    return { network: "mainnet", networkPassphrase: WalletNetwork.PUBLIC };
  }
}
