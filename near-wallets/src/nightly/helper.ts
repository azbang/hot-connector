import type { Signer } from "@near-js/signers";
import { JsonRpcProvider } from "@near-js/providers";
import type { Network, Transaction } from "@near-wallet-selector/core";
import type { AccessKeyViewRaw, FinalExecutionOutcome } from "@near-js/types";
import { KeyType, PublicKey } from "@near-js/crypto";
import type { Transaction as NearTransaction } from "@near-js/transactions";
import { createTransaction } from "@near-js/transactions";
import { baseDecode } from "@near-js/utils";

export const createTransactions = async (transactions: Array<Transaction>, signer: Signer, network: Network): Promise<NearTransaction[]> => {
  const nearTransactions: NearTransaction[] = [];
  const provider = new JsonRpcProvider({
    url: network.nodeUrl,
  });

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
    console.log(transaction);
    nearTransactions.push(transaction);
  }
  return nearTransactions;
};

export const signAndSendTransactionsHandler = async (
  transactions: Array<Transaction>,
  signer: Signer,
  network: Network
): Promise<Array<FinalExecutionOutcome>> => {
  const nearTxs = await createTransactions(transactions, signer, network);
  const results: Array<FinalExecutionOutcome> = [];
  for (const tx of nearTxs) {
    const result = await window.selector.external("nightly.near", "signTransaction", tx.encode(), true);
    results.push(result);
  }
  return results;
};
