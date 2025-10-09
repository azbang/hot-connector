import { ECDSASigValue } from "@peculiar/asn1-ecc";
import { AsnParser } from "@peculiar/asn1-schema";
import { base58, hex } from "@scure/base";
import { base64urlnopad } from "@scure/base";
import { sign } from "tweetnacl";

// Supported curves
export type CurveType = "p256" | "ed25519";

type Base58 = string;
export type FormattedPublicKey = `${CurveType}:${Base58}`;

/**
 * https://www.w3.org/TR/webauthn-2/#credential-public-key
 */
export type CredentialKey = {
  curveType: CurveType;
  publicKey: Uint8Array;
};

export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let pointer = 0;
  const totalLength = arrays.reduce((prev, curr) => prev + curr.length, 0);
  const toReturn = new Uint8Array(totalLength);

  for (const arr of arrays) {
    toReturn.set(arr, pointer);
    pointer += arr.length;
  }

  return toReturn;
}

export function parsePublicKey(formattedPublicKey: string): CredentialKey {
  const curveType = getCurveType(formattedPublicKey);

  switch (curveType) {
    case "p256": {
      let publicKey: Uint8Array;

      try {
        publicKey = base58.decode(formattedPublicKey.slice(5));
      } catch (err) {
        throw new Error("Public key is not base58 encoded", { cause: err });
      }

      if (publicKey.length !== 64) {
        throw new Error(
          `Invalid public key size for P-256 curve, it must be 64 bytes, but got ${publicKey.length} bytes`
        );
      }

      return { curveType, publicKey };
    }

    case "ed25519": {
      let publicKey: Uint8Array;

      try {
        publicKey = base58.decode(formattedPublicKey.slice(8));
      } catch (err) {
        throw new Error("Public key is not base58 encoded", { cause: err });
      }

      if (publicKey.length !== 32) {
        throw new Error(
          `Invalid public key size for Ed25519 curve, it must be 32 bytes, but got ${publicKey.length} bytes`
        );
      }

      return { curveType, publicKey };
    }

    default:
      throw new Error(`Unsupported curve type ${curveType}`);
  }
}

function getCurveType(formattedPublicKey: string): string {
  const delim = formattedPublicKey.indexOf(":");
  if (delim === -1) throw new Error("Invalid public key format");
  return formattedPublicKey.slice(0, delim);
}

/**
 * Confirms that the assertion was signed by the authenticator with specified public key
 */
export async function verifyAuthenticatorAssertion(
  assertation: AuthenticatorAssertionResponse,
  { curveType, publicKey }: CredentialKey,
  challenge: Uint8Array
): Promise<boolean> {
  if (extractSignedChallenge(assertation) !== base64urlnopad.encode(challenge)) {
    return false;
  }

  return verifyWebAuthnSignature({
    clientDataJSON: assertation.clientDataJSON,
    authenticatorData: assertation.authenticatorData,
    signature: extractRawSignature(assertation.signature, curveType),
    curveType,
    publicKey,
  });
}

export async function verifyWebAuthnSignature({
  clientDataJSON,
  authenticatorData,
  signature,
  curveType,
  publicKey,
}: {
  clientDataJSON: Uint8Array | ArrayBuffer;
  authenticatorData: Uint8Array | ArrayBuffer;
  signature: Uint8Array;
  curveType: CurveType;
  publicKey: Uint8Array;
}) {
  // @ts-ignore
  const clientDataHash = await crypto.subtle.digest("SHA-256", clientDataJSON);
  const signedBytes = concatUint8Arrays([new Uint8Array(authenticatorData), new Uint8Array(clientDataHash)]);
  const publicKeyWebCryptoAPI = reconstructWebCryptoAPIPublicKey(publicKey, curveType);

  switch (curveType) {
    case "p256": {
      const key = await crypto.subtle.importKey(
        "raw", // @ts-ignore
        publicKeyWebCryptoAPI,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
      );

      // @ts-ignore
      return crypto.subtle.verify({ name: "ECDSA", hash: { name: "SHA-256" } }, key, signature, signedBytes);
    }

    case "ed25519": {
      return sign.detached.verify(signedBytes, signature, publicKeyWebCryptoAPI);
    }

    default:
      curveType satisfies never;
      throw new Error(`Unsupported curve type ${curveType}`);
  }
}

/**
 * Makes a public key that can be used with WebCryptoAPI from the raw public key bytes
 */
function reconstructWebCryptoAPIPublicKey(publicKey: Uint8Array, curveType: CurveType): Uint8Array {
  switch (curveType) {
    case "p256": {
      const x = publicKey.slice(0, 32);
      const y = publicKey.slice(32, 64);
      return concatUint8Arrays([new Uint8Array([0x04]), x, y]);
    }

    case "ed25519":
      return publicKey;

    default:
      curveType satisfies never;
      throw new Error(`Unsupported curve type ${curveType}`);
  }
}

/**
 * Tries to determine the challenge that was signed by the authenticator
 */
function extractSignedChallenge(assertation: AuthenticatorAssertionResponse): string | null {
  const clientDataJSON = new TextDecoder().decode(assertation.clientDataJSON);

  try {
    const clientData = JSON.parse(clientDataJSON);
    if (typeof clientData.challenge === "string") return clientData.challenge;
  } catch {
    console.error("Failed to parse clientDataJSON");
  }

  return null;
}

/**
 * Gets the actual signature from AuthenticatorAssertionResponse#signature bytes
 */
export function extractRawSignature(attestationSignature_: ArrayBuffer | Uint8Array, curveType: CurveType): Uint8Array {
  const attestationSignature = new Uint8Array(attestationSignature_);

  switch (curveType) {
    case "ed25519":
      return attestationSignature;

    case "p256": {
      // Refer to the WebAuthn specification for signature attestation types:
      // https://www.w3.org/TR/webauthn-3/#sctn-signature-attestation-types
      // For COSEAlgorithmIdentifier -7 (ES256) and other ECDSA-based algorithms,
      // the signature value MUST be encoded as an ASN.1 DER Ecdsa-Sig-Value.
      const parsedSignature = AsnParser.parse(attestationSignature, ECDSASigValue);
      let rBytes: Uint8Array = new Uint8Array(parsedSignature.r);
      let sBytes: Uint8Array = new Uint8Array(parsedSignature.s);

      if (shouldRemoveLeadingZero(rBytes)) {
        rBytes = rBytes.slice(1);
      }
      if (shouldRemoveLeadingZero(sBytes)) {
        sBytes = sBytes.slice(1);
      }

      sBytes = normalizeSignatureS(sBytes);

      return concatUint8Arrays([rBytes, sBytes]);
    }

    default:
      curveType satisfies never;
      throw new Error(`Unsupported curve type ${curveType}`);
  }
}

/**
 * Specific for DER encoding of ECDSA signature.
 * Shouldn't be used for other purposes.
 */
function shouldRemoveLeadingZero(bytes: Uint8Array): boolean {
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  return bytes[0] === 0x0 && (bytes[1]! & (1 << 7)) !== 0;
}

/**
 * Ensures the signature's s-value is in the lower half of the curve order
 * to prevent signature malleability.
 * See: https://github.com/kadenzipfel/smart-contract-vulnerabilities/blob/master/vulnerabilities/signature-malleability.md
 */
export function normalizeSignatureS(sBytes: Uint8Array): Uint8Array {
  const P256_N = BigInt("0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");
  const P256_N_HALF = P256_N >> 1n;

  const sHex = hex.encode(sBytes);
  const s = BigInt(`0x${sHex}`);

  if (s > P256_N_HALF) {
    const sLow = P256_N - s;
    return hex.decode(sLow.toString(16).padStart(64, "0"));
  }

  return sBytes;
}
