import {
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignAndSendTransactionMethod,
  type SolanaSignAndSendTransactionOutput,
  SolanaSignIn,
  type SolanaSignInFeature,
  type SolanaSignInMethod,
  type SolanaSignInOutput,
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  type SolanaSignMessageMethod,
  type SolanaSignMessageOutput,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
  type SolanaSignTransactionMethod,
  type SolanaSignTransactionOutput,
} from "@solana/wallet-standard-features";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import type { Wallet } from "@wallet-standard/base";
import { baseDecode } from "@near-js/utils";
import {
  StandardConnect,
  type StandardConnectFeature,
  type StandardConnectMethod,
  StandardDisconnect,
  type StandardDisconnectFeature,
  type StandardDisconnectMethod,
  StandardEvents,
  type StandardEventsFeature,
  type StandardEventsListeners,
  type StandardEventsNames,
  type StandardEventsOnMethod,
} from "@wallet-standard/features";
import { GhostWalletAccount } from "./account";
import { SOLANA_CHAINS, GhostFeature, GhostNamespace, isVersionedTransaction, SolanaChain, isSolanaChain, bytesEqual } from "./utils";

export class GhostWallet implements Wallet {
  _account: GhostWalletAccount | null = null;
  readonly _listeners: { [E in StandardEventsNames]?: StandardEventsListeners[E][] } = {};
  readonly _version = "1.0.0" as const;
  readonly _name = "HOT Wallet" as const;
  readonly _icon = "https://storage.herewallet.app/logo.png";
  readonly _ghost: any;

  get version() {
    return this._version;
  }

  get name() {
    return this._name;
  }

  get icon() {
    return this._icon as any;
  }

  get chains() {
    return SOLANA_CHAINS.slice();
  }

  get features(): StandardConnectFeature &
    StandardDisconnectFeature &
    StandardEventsFeature &
    SolanaSignAndSendTransactionFeature &
    SolanaSignTransactionFeature &
    SolanaSignMessageFeature &
    SolanaSignInFeature &
    GhostFeature {
    return {
      [StandardConnect]: {
        version: "1.0.0",
        connect: this._connect,
      },
      [StandardDisconnect]: {
        version: "1.0.0",
        disconnect: this._disconnect,
      },
      [StandardEvents]: {
        version: "1.0.0",
        on: this._on,
      },
      [SolanaSignAndSendTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signAndSendTransaction: this._signAndSendTransaction,
      },
      [SolanaSignTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: this._signTransaction,
      },
      [SolanaSignMessage]: {
        version: "1.0.0",
        signMessage: this._signMessage,
      },
      [SolanaSignIn]: {
        version: "1.0.0",
        signIn: this._signIn,
      },
      [GhostNamespace]: {
        ghost: this._ghost,
      },
    };
  }

  get accounts() {
    return this._account ? [this._account] : [];
  }

  constructor(ghost: any) {
    this._ghost = ghost;
    ghost.on("connect", this._connected, this);
    ghost.on("disconnect", this._disconnected, this);
    ghost.on("accountChanged", this._reconnected, this);
    this._connected();
  }

  _on: StandardEventsOnMethod = (event, listener) => {
    this._listeners[event]?.push(listener) || (this._listeners[event] = [listener]);
    return (): void => this._off(event, listener);
  };

  _emit<E extends StandardEventsNames>(event: E, ...args: Parameters<StandardEventsListeners[E]>): void {
    // eslint-disable-next-line prefer-spread
    this._listeners[event]?.forEach((listener) => listener.apply(null, args));
  }

  _off<E extends StandardEventsNames>(event: E, listener: StandardEventsListeners[E]): void {
    this._listeners[event] = this._listeners[event]?.filter((existingListener) => listener !== existingListener);
  }

  _connected = () => {
    const address = this._ghost.publicKey?.toBase58();
    if (address) {
      const publicKey = this._ghost.publicKey!.toBytes();

      const account = this._account;
      if (!account || account.address !== address || !bytesEqual(account.publicKey, publicKey)) {
        this._account = new GhostWalletAccount({ address, publicKey });
        this._emit("change", { accounts: this.accounts });
      }
    }
  };

  _disconnected = () => {
    if (this._account) {
      this._account = null;
      this._emit("change", { accounts: this.accounts });
    }
  };

  _reconnected = () => {
    if (this._ghost.publicKey) {
      this._connected();
    } else {
      this._disconnected();
    }
  };

  _connect: StandardConnectMethod = async ({ silent } = {}) => {
    if (!this._account) await this._ghost.connect(silent ? { onlyIfTrusted: true } : undefined);
    this._connected();
    return { accounts: this.accounts };
  };

  _disconnect: StandardDisconnectMethod = async () => {
    await this._ghost.disconnect();
  };

  _signAndSendTransaction: SolanaSignAndSendTransactionMethod = async (...inputs) => {
    if (!this._account) throw new Error("not connected");

    const outputs: SolanaSignAndSendTransactionOutput[] = [];

    if (inputs.length === 1) {
      const { transaction, account, chain, options } = inputs[0]!;
      const { minContextSlot, preflightCommitment, skipPreflight, maxRetries } = options || {};
      if (account !== this._account) throw new Error("invalid account");
      if (!isSolanaChain(chain)) throw new Error("invalid chain");

      const { signature } = await this._ghost.signAndSendTransaction(VersionedTransaction.deserialize(transaction), {
        preflightCommitment,
        minContextSlot,
        maxRetries,
        skipPreflight,
      });

      outputs.push({ signature: baseDecode(signature) });
    } else if (inputs.length > 1) {
      for (const input of inputs) {
        outputs.push(...(await this._signAndSendTransaction(input)));
      }
    }

    return outputs;
  };

  _signTransaction: SolanaSignTransactionMethod = async (...inputs) => {
    if (!this._account) throw new Error("not connected");

    const outputs: SolanaSignTransactionOutput[] = [];

    if (inputs.length === 1) {
      const { transaction, account, chain } = inputs[0]!;
      if (account !== this._account) throw new Error("invalid account");
      if (chain && !isSolanaChain(chain)) throw new Error("invalid chain");

      const signedTransaction = await this._ghost.signTransaction(VersionedTransaction.deserialize(transaction));

      const serializedTransaction = isVersionedTransaction(signedTransaction)
        ? signedTransaction.serialize()
        : (signedTransaction as Transaction).serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          });

      outputs.push({ signedTransaction: serializedTransaction });
    } else if (inputs.length > 1) {
      let chain: SolanaChain | undefined = undefined;
      for (const input of inputs) {
        if (input.account !== this._account) throw new Error("invalid account");
        if (input.chain) {
          if (!isSolanaChain(input.chain)) throw new Error("invalid chain");
          if (chain) {
            if (input.chain !== chain) throw new Error("conflicting chain");
          } else {
            chain = input.chain;
          }
        }
      }

      const transactions = inputs.map(({ transaction }) => VersionedTransaction.deserialize(transaction));
      const signedTransactions = await this._ghost.signAllTransactions(transactions);

      outputs.push(
        ...signedTransactions.map((signedTransaction: any) => {
          const serializedTransaction = isVersionedTransaction(signedTransaction)
            ? signedTransaction.serialize()
            : (signedTransaction as Transaction).serialize({
                requireAllSignatures: false,
                verifySignatures: false,
              });

          return { signedTransaction: serializedTransaction };
        })
      );
    }

    return outputs;
  };

  _signMessage: SolanaSignMessageMethod = async (...inputs) => {
    if (!this._account) throw new Error("not connected");

    const outputs: SolanaSignMessageOutput[] = [];

    if (inputs.length === 1) {
      const { message, account } = inputs[0]!;
      if (account !== this._account) throw new Error("invalid account");

      const { signature } = await this._ghost.signMessage(message);

      outputs.push({ signedMessage: message, signature });
    } else if (inputs.length > 1) {
      for (const input of inputs) {
        outputs.push(...(await this._signMessage(input)));
      }
    }

    return outputs;
  };

  _signIn: SolanaSignInMethod = async (...inputs) => {
    const outputs: SolanaSignInOutput[] = [];

    if (inputs.length > 1) {
      for (const input of inputs) {
        outputs.push(await this._ghost.signIn(input));
      }
    } else {
      return [await this._ghost.signIn(inputs[0])];
    }

    return outputs;
  };
}
