import { useState, useCallback, useEffect } from "react";

import { TokenBalance } from "./types";
import { HotConnector } from "./HotConnector";
import { OmniWallet } from "./OmniWallet";

export const useWibe3 = (hot: HotConnector) => {
  const [wallet, setWallet] = useState<OmniWallet | null>(hot.wallets[0]);
  const [balances, setBalances] = useState<TokenBalance[]>([]);

  useEffect(() => {
    const offConnect = hot.onConnect(async ({ wallet }) => setWallet(wallet));
    const offDisconnect = hot.onDisconnect(() => setWallet(null));
    return () => (offConnect(), offDisconnect());
  }, [hot]);

  const connect = useCallback(async () => {
    await hot.connect();
  }, [hot]);

  return { wallet, balances, connect };
};
