# Wibe3

`yarn add @hot-labs/wibe3`

Multi-chain connector for NEAR Intents support.
Implements NEAR Intents support for the following networks:

- NEAR
- EVM
- Solana
- TON
- Stellar

Also supported: Passkey accounts and Google Auth via HOT MPC Network

```ts
const connector = new HotConnector({
  enableGoogle: true,
  projectId: "1292473190ce7eb75c9de67e15aaad99",
  metadata: {
    name: "Example App",
    description: "Example App",
    url: window.location.origin,
    icons: ["/favicon.ico"],
  },
});

connector.onConnect(async ({ wallet }) => {
  const address = await wallet.getAddress();

  // Easy to interact with NEAR Intents on any wallet
  const intentAddress = await wallet.getIntentsAddress();
  const signed = await wallet.signIntents([{ intent: "token_diff", ... }])
  await Intents.publishSignedIntents([signed]);
});

connector.onDisconnect(({ wallet }) => {});

```

## TODO: simple api to interact with omni assets

```ts
// Open deposit flow from wallet to NEAR Intents
await wallet.depositToken(OmniToken.USDT, 10);

// Abstract API to transfer OMNI Tokens
const receiver = await IntentAccount(Network.TON, "EQ...");
await wallet.transferToken(OmniToken.USDT, 2, receiver);

// Withdraw to wallet!
await wallet.withdrawToken(OmniToken.USDT, 2);
```
