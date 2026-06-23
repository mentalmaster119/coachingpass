// Web Crypto API based Cryptographic utilities for Convex V8 Runtime
// Avoids bundling node's built-in "crypto" module to prevent compilation failures

export const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC99AF8K4K82cBL
0haGOojEBZ9716EhE5+biLx70mkPi+f0kbvyQeeSHvFYBb8t3kADHf8Ro9WJ7YlM
Uy5fc7GUPiiQ/0bUAGshp6UcJ2007HUwEdycgBSiSoJe63JvXr7Yu0vcyrMnToTX
PrGMZCeYTb3MrWD3XJ99k3s03wsT1A1C+y/U5GMXqvNeCRr0cY6HYuU8R8MQE06D
t2BsLB6HNp74cwPtkCBtEGO5Caj51XtB52kg/vCLFR17wgQirxkShwVTASUB9gFO
G+ZQ6+MsyMkLC7Yf5clvnZlSRFrGjKUbUgrNHsJ2n5bLivFjn5P5LAqXP9NUUdTE
2on722kzAgMBAAECggEADzbL2nQQgLhYg6bvWrXo5JMzHs16oHZJZ0EDuhxatNeQ
VWrjKLhCaDyZOPy3Py2/Zvoc+jIEm76bEhieRlMZl7vr+0N7zhjwe7dJOeDAiVrt
C4bkUONptt8mSc/GEFYaDax55+4sr9fFCDzQJkrGG+R4ilW5EzO0d7x7XRTTEGkQ
U7H95HnWP3saIYzE03i4ejyPTKHlwOTXEl2cxzzDGf2+zePb3rsVrzuLrO1Kd0iZ
eAjIaVfGLdArLO+CgL+wtlWZQEHbgCCZZOUUV4wDryyLeCkCGVNCp/VkN8THnt3k
jLCep3+QSi9mJCLYKvHSkphXAZb7liz+HRzt/HUqlQKBgQDiHpHE3zbpzN7njuzF
nBTrrpR2AEe4NT1AwS5baWQg7MRhoVd+rNnTfL4WmPp+blI/j/EFNZfKMURVk8s4
X8cUcza3a5iw8K1wOqk+karEe2LCW1Iv7CRvsvJCAy2KqtMYFOuJWG0BUqEH1Qkn
HGD9rD9nNBFrXkxd259zYx1bhQKBgQDXDfZAlvMgVtdDQN9Ir/Nzbf4oyn4OQmjt
VQ+3TYKKNdN2noTLB2ZFzYW+Zn/xYfFKXRXFkOzO/AItC7GgyXnbkPmF8XCNItw7
dcZfXGiviU2XENARXdJVUAa+GB7JkiDsbOSC4kj/GxCpIt5/UuVranqBiNebHkDB
SRJwM+/DVwKBgBjNy6Wx6p8o9walmflvTqgvxV9QVo2xYV+6ETC71dz6u+wNu8BM
i7R0SZHHBCtcRK9uRb0RjO4EC3/rr24mq3rlzInARsaaEBxwguI3LmlRM5soU1Ko
b7LFCWgOWy+L344TtWaiiYqMmtd2GgPtTAJno6jZgFOry2q8TbhllfHVAoGAORz3
Ik40gYkuoCjRY99+u1Ah6LlmYukWLrmhc9/85DHJWD5fLABqE+2yME/OeM+3IjW4
e4Cys4HQHiB16yq21y4YZo8pggIZFR2BMoA7OSsw1QbdC0+sdYXMVJ3ZR1Ussz10
LqJkGoQYl6KwDoZ4cV+U62PpRsPxFKQQZoYUjf8CgYAapDenUKhqKXTmSQOn9UYa
AL/QOdq/G4+5RDWFXoQFm3XjiPH5oVClnl3OVop9/KGc4hpE9sDbIxyVHDeWmwm9
DEJP5s4qD3JfU7n8fFlKy5D+4TidmFuo6P1bXNvIBMWs6pewO2kUniOW5Vfd15Te
Bdbysxb1tJaPYYQ+YNob+w==
-----END PRIVATE KEY-----`;

export const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvfQBfCuCvNnAS9IWhjqI
xAWfe9ehIROfm4i8e9JpD4vn9JG78kHnkh7xWAW/Ld5AAx3/EaPVie2JTFMuX3Ox
lD4okP9G1ABrIaelHCdtNOx1MBHcnIAUokqCXutyb16+2LtL3MqzJ06E1z6xjGQn
mE29zK1g91yffZN7NN8LE9QNQvsv1ORjF6rzXgka9HGOh2LlPEfDEBNOg7dgbCwe
hzae+HMD7ZAgbRBjuQmo+dV7QedpIP7wixUde8IEIq8ZEocFUwElAfYBThvmUOvj
LMjJCwu2H+XJb52ZUkRaxoylG1IKzR7Cdp+Wy4rxY5+T+SwKlz/TVFHUxNqJ+9tp
MwIDAQAB
-----END PUBLIC KEY-----`;

export const JWK_PUBLIC = {
  kty: "RSA",
  use: "sig",
  alg: "RS256",
  kid: "coachingpass-key-id",
  n: "vfQBfCuCvNnAS9IWhjqIxAWfe9ehIROfm4i8e9JpD4vn9JG78kHnkh7xWAW_Ld5AAx3_EaPVie2JTFMuX3OxlD4okP9G1ABrIaelHCdtNOx1MBHcnIAUokqCXutyb16-2LtL3MqzJ06E1z6xjGQnmE29zK1g91yffZN7NN8LE9QNQvsv1ORjF6rzXgka9HGOh2LlPEfDEBNOg7dgbCwehzae-HMD7ZAgbRBjuQmo-dV7QedpIP7wixUde8IEIq8ZEocFUwElAfYBThvmUOvjLMjJCwu2H-XJb52ZUkRaxoylG1IKzR7Cdp-Wy4rxY5-T-SwKlz_TVFHUxNqJ-9tpMw",
  e: "AQAB"
};

// Base64Url helper functions
function base64urlEncode(str: string | ArrayBuffer): string {
  let base64 = "";
  if (typeof str === "string") {
    // encode utf-8 string to base64
    base64 = btoa(unescape(encodeURIComponent(str)));
  } else {
    // encode arraybuffer to base64
    const bytes = new Uint8Array(str);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  return base64
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

// Convert PEM format keys to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, "")
    .replace(/-----END [A-Z ]+-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Import PKCS#8 Private Key for Signing
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const keyBuffer = pemToArrayBuffer(pem);
  return await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

// Import SPKI Public Key for Verifying
async function importPublicKey(pem: string): Promise<CryptoKey> {
  const keyBuffer = pemToArrayBuffer(pem);
  return await crypto.subtle.importKey(
    "spki",
    keyBuffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"]
  );
}

/**
 * Hash a password using PBKDF2 (단방향 해싱 - Web Crypto API)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Generate 16 bytes random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

  // Import key
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  // Derive bits (10,000 iterations, SHA-512)
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 10000,
      hash: "SHA-512"
    },
    baseKey,
    512 // 64 bytes
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${saltHex}$${hashHex}`;
}

/**
 * Verify if the input password matches the stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 2) return false;
    const [saltHex, originalHash] = parts;

    // Convert salt hex to Uint8Array
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 10000,
        hash: "SHA-512"
      },
      baseKey,
      512
    );

    const hashHex = Array.from(new Uint8Array(derivedBits))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex === originalHash;
  } catch (error) {
    return false;
  }
}

/**
 * Sign a custom JWT token (RS256)
 */
export async function signToken(
  payload: { id: string; email: string; name: string },
  issuer: string,
  expiresInDays = 7
): Promise<string> {
  const header = { alg: "RS256", typ: "JWT", kid: JWK_PUBLIC.kid };
  const exp = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);
  const iat = Math.floor(Date.now() / 1000);
  
  const jwtPayload = {
    sub: payload.id,
    iss: issuer,
    aud: "coachingpass-client-id", // Matches Auth.config.ts applicationID
    name: payload.name,
    email: payload.email,
    tokenIdentifier: `${issuer}|${payload.id}`,
    exp,
    iat
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(jwtPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await importPrivateKey(PRIVATE_KEY_PEM);
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureInput);
  
  // RS256 signature generation
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    data
  );
  
  const signature = base64urlEncode(signatureBuffer);
  return `${signatureInput}.${signature}`;
}

/**
 * Verify and decode a custom JWT token (RS256)
 */
export async function verifyToken(
  token: string
): Promise<{ sub: string; email: string; name: string; tokenIdentifier: string; exp: number } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const publicKey = await importPublicKey(PUBLIC_KEY_PEM);
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureInput);
    
    // Decode base64url signature back to ArrayBuffer
    const sigB64 = signature.replace(/-/g, "+").replace(/_/g, "/");
    const sigBuffer = pemToArrayBuffer(sigB64);
    
    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      sigBuffer,
      data
    );

    if (!isValid) return null;

    // Decode and check expiry
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (payload.exp && currentTimestamp > payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}
