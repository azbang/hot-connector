import { useState } from "react";
import { useWibe3, Wibe3Client } from "../../wibe3/src/client";
import { OmniToken, Wibe3Wallet } from "../../wibe3/src";

const wibe3 = new Wibe3Client();

const wallet = new Wibe3Wallet({
  privateKey: (import.meta as any).env.VITE_PRIVATE_KEY!,
});

export const Wibe = () => {
  const { address, tradingAddress, withdraw, connect, auth, disconnect, refresh } = useWibe3(wibe3);
  const [jwt, setJwt] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const authWallet = async () => {
    const signed = await auth();
    const isValid = await wallet.validateAuth(signed);
    if (!isValid) throw new Error("Invalid auth");
    setJwt("jwt");
  };

  const claim = async () => {
    try {
      setIsClaiming(true);
      if (!tradingAddress) throw new Error("Trading address not found");
      await wallet.transfer({ token: OmniToken.USDT, amount: 0.01, to: tradingAddress, paymentId: "claim3" });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await refresh().catch(() => {});
      alert("Claim successful");
    } catch (e) {
      alert(e);
    } finally {
      setIsClaiming(false);
    }
  };

  const withdrawToken = async () => {
    try {
      setIsWithdrawing(true);
      await withdraw(OmniToken.USDT, 0.01);
      await refresh().catch(() => {});
      alert("Withdraw successful");
    } catch (e) {
      alert(e);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!address) {
    return (
      <div className="view">
        <button className="input-button" onClick={() => connect()}>
          Connect
        </button>
      </div>
    );
  }

  if (!jwt) {
    return (
      <div className="view">
        <Balances />

        <button className="input-button" onClick={() => authWallet()}>
          Auth
        </button>
        <button className="input-button" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="view">
      <Balances />

      <button className="input-button" disabled={isClaiming} onClick={() => claim()}>
        {isClaiming ? "Claiming..." : "Claim 0.01 USDT"}
      </button>

      <button className="input-button" disabled={isWithdrawing} onClick={() => withdrawToken()}>
        {isWithdrawing ? "Withdrawing..." : "Withdraw 0.01 USDT"}
      </button>

      <button className="input-button" onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
};

const Balances = () => {
  const { balances, address } = useWibe3(wibe3);

  if (!address) return null;

  return (
    <div style={{ textAlign: "left", marginBottom: 16 }}>
      <p style={{ margin: 0 }}>Address: {address}</p>

      <p style={{ margin: 0, marginTop: 8 }}>Balances:</p>
      {balances.map((balance) => (
        <div key={balance.symbol} className="input-button" style={{ marginTop: 8 }}>
          <img
            style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
            src={balance.icon}
            alt={balance.symbol}
          />
          <p style={{ margin: 0, marginLeft: 8 }}>
            {balance.float} {balance.symbol}
          </p>
        </div>
      ))}
    </div>
  );
};
