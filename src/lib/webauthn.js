// Minimal WebAuthn helpers for LBC AI Ultra — the browser's standard
// platform-authenticator API (Face ID / Touch ID / Windows Hello).
// Biometric data never leaves the device: the authenticator releases only
// a public key (enrollment) and per-use signatures (assertion).
// No external dependencies — just base64url conversion of the structures
// the server needs.

export function base64UrlToBytes(b64u) {
  let b64 = String(b64u).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function bytesToBase64Url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Honest support check: a user-verifying platform authenticator must exist.
export async function isFaceIdSupported() {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (_) {
    return false;
  }
}

export function toRegistrationCredentialOptions(options) {
  return {
    publicKey: {
      challenge: base64UrlToBytes(options.challenge),
      rp: options.rp,
      user: { ...options.user, id: base64UrlToBytes(options.user.id) },
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      excludeCredentials: (options.excludeCredentials || []).map((c) => ({
        id: base64UrlToBytes(c.id),
        type: 'public-key',
        transports: c.transports,
      })),
      authenticatorSelection: options.authenticatorSelection,
      attestation: options.attestation || 'none',
    },
  };
}

export function toAuthenticationCredentialOptions(options) {
  return {
    publicKey: {
      challenge: base64UrlToBytes(options.challenge),
      rpId: options.rpId,
      timeout: options.timeout,
      userVerification: options.userVerification || 'required',
      allowCredentials: (options.allowCredentials || []).map((c) => ({
        id: base64UrlToBytes(c.id),
        type: 'public-key',
        transports: c.transports || ['internal'],
      })),
    },
  };
}

export function serializeRegistration(credential) {
  return {
    id: credential.id,
    rawId: bytesToBase64Url(new Uint8Array(credential.rawId)),
    type: credential.type,
    response: {
      clientDataJSON: bytesToBase64Url(new Uint8Array(credential.response.clientDataJSON)),
      attestationObject: bytesToBase64Url(new Uint8Array(credential.response.attestationObject)),
    },
    clientExtensionResults: credential.getClientExtensionResults
      ? credential.getClientExtensionResults()
      : {},
  };
}

export function serializeAssertion(credential) {
  return {
    id: credential.id,
    rawId: bytesToBase64Url(new Uint8Array(credential.rawId)),
    type: credential.type,
    response: {
      clientDataJSON: bytesToBase64Url(new Uint8Array(credential.response.clientDataJSON)),
      authenticatorData: bytesToBase64Url(new Uint8Array(credential.response.authenticatorData)),
      signature: bytesToBase64Url(new Uint8Array(credential.response.signature)),
      userHandle: credential.response.userHandle
        ? bytesToBase64Url(new Uint8Array(credential.response.userHandle))
        : undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults
      ? credential.getClientExtensionResults()
      : {},
  };
}