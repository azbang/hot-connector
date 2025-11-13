import { FinalExecutionOutcome } from "@near-js/types";

interface IPropsFinalOutcome {
  outcome: FinalExecutionOutcome;
  network: "testnet" | "mainnet";
}

export const FinalOutcome = ({ outcome, network }: IPropsFinalOutcome) => {
  return (
    <div className={"input-group"}>
      <p className={"input-label"}>Last Outcome</p>
      {outcome != null && (
        <div className={"flex flex-col gap-2 items-start"}>
          <span className={"text-sm"}>{outcome.final_execution_status}</span>
          <a
            target={"_blank"}
            className={"break-all text-xs text-sky-500"}
            href={`https://${network === "testnet" ? "testnet." : ""}nearblocks.io/txns/${outcome.transaction_outcome.id}`}
          >
            {outcome.transaction_outcome.id}
          </a>
        </div>
      )}
    </div>
  );
};
