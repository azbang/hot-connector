import { smallGreyText } from "../ui/tailwind-vars.ts";

interface IPropsNetworkSelector {
  network: "testnet" | "mainnet";
  onSelectNetwork: (network: "testnet" | "mainnet") => void;
}

export const NetworkSelector = ({ onSelectNetwork, network }: IPropsNetworkSelector) => {
  return (
    <div className="flex items-center justify-between">
      <span className={`${smallGreyText} mr-5`}>Select Network</span>
      <select value={network} className="border border-gray-700 rounded p-1" onChange={(e) => onSelectNetwork(e.target.value as "testnet" | "mainnet")}>
        <option className={"bg-sky-950 text-white"} value="testnet">
          Testnet
        </option>
        <option className={"bg-sky-950 text-white"} value="mainnet">
          Mainnet
        </option>
      </select>
    </div>
  );
};
