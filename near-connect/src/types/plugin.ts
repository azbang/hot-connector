import type { NearWalletBase, SignInParams, SignAndSendTransactionParams, SignAndSendTransactionsParams, SignMessageParams, Account, SignedMessage, FinalExecutionOutcome, Network } from "./wallet";

export type PluginResult<T = any> =
  | { type: "next"; value: any }
  | { type: "result"; value: T };

export type PluginResultFn<T> = (value: T) => PluginResult<T>;
export type PluginNextFn<TArgs, TReturn> = (args: TArgs) => Promise<TReturn>;

export interface PluginContext {
  connector: any;
}

export interface Plugin {
  /**
   * Intercept signIn method
   */
  signIn?: (
    wallet: NearWalletBase,
    args: SignInParams | undefined,
    result: PluginResultFn<Account[]>,
    next: PluginNextFn<SignInParams | undefined, Account[]>
  ) => Promise<PluginResult<Account[]>>;

  /**
   * Intercept signOut method
   */
  signOut?: (
    wallet: NearWalletBase,
    args: { network?: Network } | undefined,
    result: PluginResultFn<void>,
    next: PluginNextFn<{ network?: Network } | undefined, void>
  ) => Promise<PluginResult<void>>;

  /**
   * Intercept getAccounts method
   */
  getAccounts?: (
    wallet: NearWalletBase,
    args: { network?: Network } | undefined,
    result: PluginResultFn<Account[]>,
    next: PluginNextFn<{ network?: Network } | undefined, Account[]>
  ) => Promise<PluginResult<Account[]>>;

  /**
   * Intercept signAndSendTransaction method
   */
  signAndSendTransaction?: (
    wallet: NearWalletBase,
    tx: SignAndSendTransactionParams,
    result: PluginResultFn<FinalExecutionOutcome>,
    next: PluginNextFn<SignAndSendTransactionParams, FinalExecutionOutcome>
  ) => Promise<PluginResult<FinalExecutionOutcome>>;

  /**
   * Intercept signAndSendTransactions method
   */
  signAndSendTransactions?: (
    wallet: NearWalletBase,
    params: SignAndSendTransactionsParams,
    result: PluginResultFn<FinalExecutionOutcome[]>,
    next: PluginNextFn<SignAndSendTransactionsParams, FinalExecutionOutcome[]>
  ) => Promise<PluginResult<FinalExecutionOutcome[]>>;

  /**
   * Intercept signMessage method
   */
  signMessage?: (
    wallet: NearWalletBase,
    params: SignMessageParams,
    result: PluginResultFn<SignedMessage>,
    next: PluginNextFn<SignMessageParams, SignedMessage>
  ) => Promise<PluginResult<SignedMessage>>;

  /**
   * Intercept createKey method
   */
  createKey?: (
    wallet: NearWalletBase,
    params: { contractId: string; methodNames?: string[] },
    result: PluginResultFn<void>,
    next: PluginNextFn<{ contractId: string; methodNames?: string[] }, void>
  ) => Promise<PluginResult<void>>;
}

/**
 * Helper functions to create PluginResult objects
 */
export const createResult = <T>(value: T): PluginResult<T> => ({ type: "result", value });
export const createNext = <T>(value: T): PluginResult<T> => ({ type: "next", value });
