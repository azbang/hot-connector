import { useLocalStorage } from "usehooks-ts";
import { FinalExecutionOutcome } from "@near-js/types";
import { parseNearAmount } from "@near-js/utils";

import { IPropsWalletAction } from "./wallet-action.types.ts";
import { FinalOutcome } from "./FinalOutcome.tsx";

export const SendTx = ({ wallet, network }: IPropsWalletAction) => {
  const [amount, setAmount] = useLocalStorage(`send-tx-${network}-amount`, "0.01");
  const [receiverId, setReceiverId] = useLocalStorage(`send-tx-${network}-receiver-id`, `demo.${network}`);
  const [lastResult, setLastResult] = useLocalStorage<FinalExecutionOutcome | undefined>(`send-tx-${network}-last-result`, undefined);

  const sendTx = async () => {
    setLastResult(undefined);
    const result = await wallet.signAndSendTransaction({
      actions: [{ type: "Transfer", params: { deposit: parseNearAmount(amount)?.toString() ?? "0" } }],
      receiverId,
    });

    setLastResult(result);
  };

  return (
    <div className={"input-form"}>
      <p className={"input-form-label"}>Send Transaction (Transfer)</p>
      <div className={"input-row grid grid-cols-2 gap-4"}>
        <div className={"input-group"}>
          <p className={"input-label"}>Receiver Account</p>
          <input
            className={"input-text"}
            type={"text"}
            value={receiverId}
            onChange={(e) => {
              setReceiverId(e.target.value);
            }}
          />
        </div>
        <div className={"input-group"}>
          <p className={"input-label"}>Amount to Send</p>
          <input
            className={"input-text"}
            value={amount}
            type={"number"}
            step={"0.01"}
            onChange={(e) => {
              setAmount(e.target.value);
            }}
          />
        </div>
        <button className={"input-button"} onClick={() => sendTx()}>
          Send tx
        </button>
        {lastResult != null && <FinalOutcome outcome={lastResult} network={network} />}
      </div>
    </div>
  );
};
