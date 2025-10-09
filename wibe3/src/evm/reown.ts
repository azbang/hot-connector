import { AppKit } from "@reown/appkit";
import { base, bsc, mainnet, solana } from "@reown/appkit/networks";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { SolanaAdapter } from "@reown/appkit-adapter-solana";
import { createAppKit } from "@reown/appkit";

let appKit: AppKit;

export const getOrCreateAppKit = () => {
  if (!appKit) {
    appKit = createAppKit({
      adapters: [new EthersAdapter(), new SolanaAdapter()],
      networks: [mainnet, solana, base, bsc],
      projectId: "",
      metadata: {
        name: "Wibe3",
        description: "Wibe3",
        url: "https://wibe3.com",
        icons: ["https://wibe3.com/icon.png"],
      },
      features: {
        onramp: false,
        email: false,
        emailShowWallets: false,
        socials: false,
        analytics: false,
        smartSessions: false,
        legalCheckbox: false,
      },
    });
  }

  return appKit;
};
