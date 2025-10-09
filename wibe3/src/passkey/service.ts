import { base58 } from "@scure/base";

export type WebauthnCredential = {
  publicKey: string;
  rawId: string;
};

export async function signIn(): Promise<string> {
  const assertion = await navigator.credentials.get({
    publicKey: {
      rpId: getRelayingPartyId(),
      challenge: new Uint8Array(32),
      allowCredentials: [],
      timeout: 60000,
    },
  });

  /**
   * Some providers may return a plain object (e.g. 1Password),
   * other can return a PublicKeyCredential instance (e.g. iCloud Keychain).
   *
   * All in all, the interface of `assertion` matches PublicKeyCredential,
   * so we can safely cast it.
   */
  if (assertion == null || assertion.type !== "public-key") {
    throw new Error("Invalid attestation type");
  }

  const credential = assertion as PublicKeyCredential;
  return base58.encode(new Uint8Array(credential.rawId));
}

export async function createNew(passkeyName?: string): Promise<WebauthnCredential> {
  const formattedDate = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const finalPasskeyName = passkeyName == null || passkeyName === "" ? `User ${formattedDate}` : passkeyName;
  const registrationOptions: CredentialCreationOptions = {
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: {
        name: "Near Intents",
        id: getRelayingPartyId(),
      },
      user: {
        id: crypto.getRandomValues(new Uint8Array(32)),
        name: finalPasskeyName,
        displayName: finalPasskeyName,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -8 },
        { type: "public-key", alg: -7 },
      ],
      authenticatorSelection: {
        requireResidentKey: true,
        residentKey: "required",
        userVerification: "preferred",
      },
      timeout: 60000,
      attestation: "direct",
    },
  };

  const registration = await navigator.credentials.create(registrationOptions);

  /**
   * Some providers may return a plain object (e.g. 1Password),
   * other can return a PublicKeyCredential instance (e.g. iCloud Keychain).
   *
   * All in all, the interface of `registration` matches PublicKeyCredential,
   * so we can safely cast it.
   */
  if (registration == null || registration.type !== "public-key") {
    throw new Error("Invalid attestation type");
  }

  const credential = registration as PublicKeyCredential;
  const { publicKey, algorithm } = await extractCredentialPublicKey(credential);

  return {
    rawId: base58.encode(new Uint8Array(credential.rawId)),
    publicKey: formatPublicKey(publicKey, algorithm),
  };
}

export function getRelayingPartyId(): string {
  const hostname = window.location.hostname;
  if (Object.keys([""]).includes(hostname)) {
    return getRootDomain(hostname);
  }
  return hostname;
}

/**
 * Simple root domain extraction. Works for domains like "app.foo.com".
 * Warning: Does not handle special TLDs correctly (e.g., "foo.co.uk" will return "co.uk").
 * Use a proper domain parser for production.
 */
function getRootDomain(hostname: string): string {
  const parts = hostname.split(".");
  return parts.slice(-2).join(".");
}

export async function signMessage(
  challenge: Uint8Array | ArrayBuffer,
  { rawId }: WebauthnCredential
): Promise<AuthenticatorAssertionResponse> {
  // @ts-ignore
  const assertion = await navigator.credentials.get({
    publicKey: {
      rpId: getRelayingPartyId(),
      allowCredentials: [{ id: base58.decode(rawId), type: "public-key" }],
      timeout: 60000,
      challenge,
    },
  });

  /**
   * Some providers may return a plain object (e.g. 1Password),
   * other can return a PublicKeyCredential instance (e.g. iCloud Keychain).
   *
   * All in all, the interface of `assertion` matches PublicKeyCredential,
   * so we can safely cast it.
   */
  if (assertion == null || assertion.type !== "public-key") {
    throw new Error("Invalid assertion");
  }

  const credential = assertion as PublicKeyCredential;
  return credential.response as AuthenticatorAssertionResponse;
}

async function extractCredentialPublicKey(credential: PublicKeyCredential) {
  return parsePublicKeyWithWebCrypto(credential.response as AuthenticatorAttestationResponse);
}

async function parsePublicKeyWithWebCrypto(
  response: AuthenticatorAttestationResponse
): Promise<{ publicKey: Uint8Array; algorithm: number }> {
  const publicKeyBuffer = response.getPublicKey();
  if (publicKeyBuffer == null) {
    throw new Error("Public key is null");
  }

  const algorithm = response.getPublicKeyAlgorithm();
  switch (algorithm) {
    case -7: // ES256
      return {
        publicKey: await parseECDSAKey(publicKeyBuffer, "P-256"),
        algorithm,
      };
    case -8: // EdDSA (Ed25519)
      return {
        publicKey: await parseEdDSAKey(publicKeyBuffer),
        algorithm,
      };
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}

async function parseECDSAKey(publicKey: ArrayBuffer, namedCurve: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "spki", // Simple public-key infrastructure
    publicKey,
    { name: "ECDSA", namedCurve },
    true,
    ["verify"]
  );

  const rawKey = await crypto.subtle.exportKey("raw", cryptoKey);

  const rawKeyArray = new Uint8Array(rawKey);
  if (rawKeyArray.length !== 65) {
    throw new Error(
      `Invalid public key size for ECDSA curve, it must be 65 bytes, but got ${rawKeyArray.length} bytes`
    );
  }
  const x = rawKeyArray.slice(1, 33);
  const y = rawKeyArray.slice(33, 65);
  return new Uint8Array([...x, ...y]);
}

async function parseEdDSAKey(publicKeyBuffer: ArrayBuffer): Promise<Uint8Array> {
  const rawKeyArray = new Uint8Array(publicKeyBuffer).slice(12);
  if (rawKeyArray.length !== 32) {
    throw new Error(`Invalid Ed25519 public key length: ${rawKeyArray.length}`);
  }
  return rawKeyArray;
}

function formatPublicKey(rawPublicKey: Uint8Array, algorithm: number): string {
  switch (algorithm) {
    case -7:
      return `p256:${base58.encode(rawPublicKey)}`;
    case -8:
      return `ed25519:${base58.encode(rawPublicKey)}`;
    default:
      throw new Error(`Unsupported public key algorithm ${algorithm}`);
  }
}

export async function getCredential(rawId: string): Promise<WebauthnCredential> {
  // @ts-ignore
  const response = await getWebauthnCredential(rawId);
  return { rawId, publicKey: response.public_key };
}

export async function saveCredential(credential: WebauthnCredential): Promise<void> {
  await retryOperation(async () => {
    // @ts-ignore
    const response = await createWebauthnCredential({
      raw_id: credential.rawId,
      public_key: credential.publicKey,
      hostname: getRelayingPartyId(),
    });
    if (!response.success) {
      throw new Error("Failed to save credential");
    }
  });
}

async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 10, delay = 1000): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError ?? new Error("Operation failed after max retries");
}
