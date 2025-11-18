import { base64, base58, hex } from "@scure/base";
import { BrowserProvider, JsonRpcSigner, TransactionRequest } from "ethers";

import { OmniWallet, WalletType } from "../OmniWallet";
import EvmConnector from "./connector";

interface EvmProvider {
  address: string;
  request: (args: any) => Promise<any>;
}

class EvmWallet extends OmniWallet {
  readonly publicKey?: string;
  readonly type = WalletType.EVM;

  constructor(readonly connector: EvmConnector, readonly provider: EvmProvider) {
    super(connector);
  }

  get address() {
    return this.provider.address;
  }

  get omniAddress() {
    return this.address.toLowerCase();
  }

  async disconnect({ silent = false }: { silent?: boolean } = {}) {
    super.disconnect({ silent });
    this.provider.request({ method: "wallet_revokePermissions" });
  }

  signIntentsWithAuth = async (domain: string, intents?: Record<string, any>[]) => {
    const seed = hex.encode(window.crypto.getRandomValues(new Uint8Array(32)));
    const msgBuffer = new TextEncoder().encode(`${domain}_${seed}`);
    const nonce = await window.crypto.subtle.digest("SHA-256", new Uint8Array(msgBuffer));

    return {
      signed: await this.signIntents(intents || [], { nonce: new Uint8Array(nonce) }),
      chainId: WalletType.EVM,
      publicKey: this.address,
      address: this.address,
      seed,
    };
  };

  async signMessage(msg: string) {
    const result: string = await this.provider.request({ method: "personal_sign", params: [msg, this.address] });
    const yInt = parseInt(result.slice(-2), 16);
    const isZero = yInt === 27 || yInt === 0;
    return hex.decode(result.slice(2, -2) + (isZero ? "00" : "01"));
  }

  async sendTransaction(chain: number, request: TransactionRequest): Promise<string> {
    const provider = new BrowserProvider(this.provider);
    const signer = new JsonRpcSigner(provider, this.address);

    await this.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chain.toString(16)}` }] });
    const tx = await signer.sendTransaction(request);
    return tx.hash;
  }

  async signIntents(intents: Record<string, any>[], options?: { deadline?: number; nonce?: Uint8Array }): Promise<Record<string, any>> {
    const nonce = new Uint8Array(options?.nonce || window.crypto.getRandomValues(new Uint8Array(32)));

    const message = JSON.stringify({
      deadline: options?.deadline ? new Date(options.deadline).toISOString() : "2100-01-01T00:00:00.000Z",
      verifying_contract: "intents.near",
      signer_id: this.omniAddress,
      nonce: base64.encode(nonce),
      intents: intents,
    });

    const buffer = await this.signMessage(message);
    return {
      signature: `secp256k1:${base58.encode(buffer)}`,
      payload: message,
      standard: "erc191",
    };
  }
}

export default EvmWallet;
