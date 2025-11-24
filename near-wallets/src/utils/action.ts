import { actionCreators } from "@near-js/transactions";
import { PublicKey } from "@near-js/crypto";

const getAccessKey = (permission: any) => {
  if (permission === "FullAccess") {
    return actionCreators.fullAccessKey();
  }

  const { receiverId, methodNames = [] } = permission;
  const allowance = permission.allowance ? BigInt(permission.allowance) : undefined;

  return actionCreators.functionCallAccessKey(receiverId, methodNames, allowance);
};

export const createAction = (action: any) => {
  switch (action.type) {
    case "CreateAccount":
      return actionCreators.createAccount();
    case "DeployContract": {
      const { code } = action.params;

      return actionCreators.deployContract(code);
    }
    case "FunctionCall": {
      const { methodName, args, gas, deposit } = action.params;
      return actionCreators.functionCall(methodName, args, BigInt(gas), BigInt(deposit));
    }

    case "Transfer": {
      const { deposit } = action.params;

      return actionCreators.transfer(BigInt(deposit));
    }
    case "Stake": {
      const { stake, publicKey } = action.params;

      return actionCreators.stake(BigInt(stake), PublicKey.from(publicKey));
    }
    case "AddKey": {
      const { publicKey, accessKey } = action.params;

      return actionCreators.addKey(
        PublicKey.from(publicKey),
        // TODO: Use accessKey.nonce? near-api-js seems to think 0 is fine?
        getAccessKey(accessKey.permission)
      );
    }

    case "DeleteKey": {
      const { publicKey } = action.params;
      return actionCreators.deleteKey(PublicKey.from(publicKey));
    }

    case "DeleteAccount": {
      const { beneficiaryId } = action.params;
      return actionCreators.deleteAccount(beneficiaryId);
    }

    default:
      throw new Error("Invalid action type");
  }
};
