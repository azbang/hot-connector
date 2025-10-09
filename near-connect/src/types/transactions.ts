export interface CreateAccountAction {
  type: "CreateAccount";
}

export interface DeployContractAction {
  type: "DeployContract";
  params: {
    code: Uint8Array;
  };
}

export interface FunctionCallAction {
  type: "FunctionCall";
  params: {
    methodName: string;
    args: object;
    gas: string;
    deposit: string;
  };
}

export interface TransferAction {
  type: "Transfer";
  params: {
    deposit: string;
  };
}

export interface StakeAction {
  type: "Stake";
  params: {
    stake: string;
    publicKey: string;
  };
}

export type AddKeyPermission =
  | "FullAccess"
  | {
      receiverId: string;
      allowance?: string;
      methodNames?: Array<string>;
    };

export interface AddKeyAction {
  type: "AddKey";
  params: {
    publicKey: string;
    accessKey: {
      nonce?: number;
      permission: AddKeyPermission;
    };
  };
}

export interface DeleteKeyAction {
  type: "DeleteKey";
  params: {
    publicKey: string;
  };
}

export interface DeleteAccountAction {
  type: "DeleteAccount";
  params: {
    beneficiaryId: string;
  };
}

export type Action =
  | CreateAccountAction
  | DeployContractAction
  | FunctionCallAction
  | TransferAction
  | StakeAction
  | AddKeyAction
  | DeleteKeyAction
  | DeleteAccountAction;

export type ActionType = Action["type"];

export interface Transaction {
  signerId: string;
  receiverId: string;
  actions: Array<Action>;
}
