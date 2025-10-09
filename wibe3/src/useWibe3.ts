import { useState, useCallback, useEffect } from "react";

import { TokenBalance } from "./types";
import { HotConnector } from "./HotConnector";
import { OmniWallet } from "./OmniWallet";

export const useWibe3 = (hot: HotConnector) => {
  const [wallet, setWallet] = useState<OmniWallet | null>(hot.wallets[0]);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [address, setAddress] = useState<string | null>(null);
  const [tradingAddress, setTradingAddress] = useState<string | null>(null);

  useEffect(() => {
    const offConnect = hot.onConnect(async ({ wallet }) => setWallet(wallet));
    const offDisconnect = hot.onDisconnect(() => setWallet(null));
    return () => (offConnect(), offDisconnect());
  }, [hot]);

  useEffect(() => {
    setAddress(null);
    wallet?.getAddress().then(setAddress);
    wallet?.getIntentsAddress().then(setTradingAddress);
  }, [wallet]);

  const connect = useCallback(async () => {
    await hot.connect();
  }, [hot]);

  return { wallet, address, balances, tradingAddress, connect };
};
