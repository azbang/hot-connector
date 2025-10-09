import { base64 } from "@scure/base";

class Intents {
  async publishSignedIntents(signed: Record<string, any>[], hashes: string[] = []): Promise<string> {
    const res = await fetch("https://api0.herewallet.app/api/v1/evm/intent-solver", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        params: [{ signed_datas: signed, quote_hashes: hashes }],
        method: "publish_intents",
        id: "dontcare",
        jsonrpc: "2.0",
      }),
    });

    const { result } = await res.json();
    if (result.status === "FAILED") throw result.reason;
    const intentResult = result.intent_hashes[0];

    const getStatus = async () => {
      const statusRes = await fetch("https://api0.herewallet.app/api/v1/evm/intent-solver", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          id: "dontcare",
          jsonrpc: "2.0",
          method: "get_status",
          params: [{ intent_hash: intentResult }],
        }),
      });

      const { result } = await statusRes.json();
      return result;
    };

    const fetchResult = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result = await getStatus().catch(() => null);
      if (result == null) return await fetchResult();
      if (result.status === "SETTLED") return result.data.hash;
      if (result.status === "FAILED") throw result.reason || "Failed to publish intents";
      return await fetchResult();
    };

    const hash = await fetchResult();
    return hash;
  }

  async simulateIntents(signed: Record<string, any>[]) {
    return await this.viewMethod({
      args: { signed: signed },
      method: "simulate_intents",
      contractId: "intents.near",
    });
  }

  async getIntentsBalances(assets: string[], accountId: string): Promise<Record<string, bigint>> {
    const balances = await this.viewMethod({
      args: { token_ids: assets, account_id: accountId },
      method: "mt_batch_balance_of",
      contractId: "intents.near",
    });

    return Object.fromEntries(assets.map((asset, index) => [asset, BigInt(balances[index] || 0n)]));
  }

  async getIntentsAssets(accountId: string): Promise<string[]> {
    const assets: string[] = [];
    const limit = 250;
    let fromIndex = 0n;

    while (true) {
      const balances = await this.viewMethod({
        args: { account_id: accountId, from_index: fromIndex.toString(), limit },
        method: "mt_tokens_for_owner",
        contractId: "intents.near",
      });

      assets.push(...balances.map((b: any) => b.token_id));
      if (balances.length < limit) break;
      fromIndex += BigInt(limit);
    }

    return assets;
  }

  async viewMethod({ contractId, method, args }: { contractId: string; method: string; args: Record<string, any> }) {
    const rpc = "https://relmn.aurora.dev";
    const res = await fetch(rpc, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "dontcare",
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: contractId,
          method_name: method,
          args_base64: base64.encode(new TextEncoder().encode(JSON.stringify(args))),
        },
      }),
    });

    const { result } = await res.json();
    if (result.error) throw result.error;
    if (!result?.result) throw new Error("Failed to call view method");

    try {
      return JSON.parse(Buffer.from(result.result).toString());
    } catch {
      return result.result;
    }
  }
}

export default new Intents();
