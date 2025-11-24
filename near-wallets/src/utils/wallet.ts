import type { Signer } from "@near-js/signers";
import { JsonRpcProvider } from "@near-js/providers";
import type { AccessKeyViewRaw } from "@near-js/types";
import { KeyType, PublicKey } from "@near-js/crypto";
import type { Transaction as NearTransaction } from "@near-js/transactions";
import { createTransaction, encodeTransaction, Signature, SignedTransaction } from "@near-js/transactions";
import { baseDecode } from "@near-js/utils";
import { sha256 } from "js-sha256";

// TODO: Remove this once the wallet signer interface is updated
export abstract class LegacySigner {
  abstract createKey(accountId: string, networkId?: string, keyType?: KeyType): Promise<PublicKey>;
  abstract getPublicKey(accountId?: string, networkId?: string): Promise<PublicKey>;
  abstract signMessage(message: Uint8Array, accountId?: string, networkId?: string): Promise<Signature>;
}

// Sign transaction function for the wallet that doesn't
// implement signTransaction in their signer interface
async function legacySignTransaction(
  transaction: NearTransaction,
  signer: LegacySigner,
  accountId?: string,
  networkId?: string
): Promise<[Uint8Array, SignedTransaction]> {
  const message = encodeTransaction(transaction);
  const hash = new Uint8Array(sha256.array(message));
  const signature = await signer.signMessage(message, accountId, networkId);
  const keyType = transaction.publicKey.ed25519Key ? KeyType.ED25519 : KeyType.SECP256K1;
  const signedTx = new SignedTransaction({
    transaction,
    signature: new Signature({ keyType, data: signature.signature.data }),
  });
  return [hash, signedTx];
}

export const signTransactions = async (transactions: Array<any>, signer: Signer | LegacySigner, network: any) => {
  const provider = new JsonRpcProvider({
    url: network.nodeUrl,
  });

  const signedTransactions: Array<SignedTransaction> = [];

  for (let i = 0; i < transactions.length; i++) {
    const publicKey = await signer.getPublicKey(transactions[i].signerId, network.networkId);

    const [block, accessKey] = await Promise.all([
      provider.block({ finality: "final" }),
      provider.query<AccessKeyViewRaw>({
        request_type: "view_access_key",
        finality: "final",
        account_id: transactions[i].signerId,
        public_key: publicKey.toString(),
      }),
    ]);

    const transaction = createTransaction(
      transactions[i].signerId,
      PublicKey.from(publicKey.toString()),
      transactions[i].receiverId,
      accessKey.nonce + i + 1,
      transactions[i].actions,
      baseDecode(block.header.hash)
    );

    const [, signedTx] =
      "signTransaction" in signer && signer.signTransaction
        ? await (signer as any).signTransaction(transaction)
        : await legacySignTransaction(transaction, signer as LegacySigner, transactions[i].signerId, network.networkId);

    const finalSignedTx = new SignedTransaction({
      signature: new Signature({
        data: Buffer.from(signedTx.signature.data),
        keyType: publicKey.keyType === KeyType.SECP256K1 ? KeyType.SECP256K1 : KeyType.ED25519,
      }),
      transaction: transaction,
    });

    signedTransactions.push(finalSignedTx);
  }

  return signedTransactions;
};
