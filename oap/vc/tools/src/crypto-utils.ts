/**
 * Cryptographic utilities for Ed25519 signing and verification
 *
 * Handles key conversion, signing, and verification for Verifiable Credentials
 */

import { signAsync, verifyAsync, getPublicKeyAsync } from "@noble/ed25519";

// NOTE: We use async versions (signAsync, verifyAsync) instead of sync versions (sign, verify)
// because:
// 1. Async versions work in all environments (Node.js, browsers, Cloudflare Workers)
// 2. Async versions use Web Crypto API internally, which is available everywhere
// 3. We don't need to configure hashes.sha512 for sync operations
//
// The sync versions (sign, verify) require hashes.sha512 to be set, which is problematic
// in Cloudflare Workers where we can't easily provide a synchronous SHA-512 function.

/**
 * Convert private key from various formats to Uint8Array
 * Supports: PEM, base64, base64url, hex, raw bytes
 */
export function privateKeyToBytes(privateKey: string | Uint8Array): Uint8Array {
  if (privateKey instanceof Uint8Array) {
    return privateKey;
  }

  // Remove common prefixes
  let key = privateKey.trim();

  // Remove PEM headers/footers
  key = key.replace(/-----BEGIN.*?-----/g, "");
  key = key.replace(/-----END.*?-----/g, "");
  key = key.replace(/\s+/g, "");

  // Remove "ed25519:" prefix if present
  key = key.replace(/^ed25519:/, "");

  // Try base64url first (most common for Ed25519)
  try {
    return base64urlToBytes(key);
  } catch {
    // Try base64
    try {
      return base64ToBytes(key);
    } catch {
      // Try hex
      try {
        return hexToBytes(key);
      } catch {
        throw new Error(
          "Invalid private key format. Expected base64url, base64, hex, or PEM format."
        );
      }
    }
  }
}

/**
 * Convert public key from various formats to Uint8Array
 *
 * Supports multiple key formats:
 * - Base64url (most common for Ed25519)
 * - Base64
 * - Hex
 * - Multibase (z prefix for base58, currently assumes base64url after prefix)
 * - PEM (with headers/footers)
 * - Raw Uint8Array
 *
 * @param publicKey - Public key in any supported format
 * @returns Decoded bytes as Uint8Array
 * @throws Error if the key format is invalid or cannot be decoded
 */
export function publicKeyToBytes(publicKey: string | Uint8Array): Uint8Array {
  if (publicKey instanceof Uint8Array) {
    return publicKey;
  }

  let key = publicKey.trim();

  // Remove PEM headers/footers
  key = key.replace(/-----BEGIN.*?-----/g, "");
  key = key.replace(/-----END.*?-----/g, "");
  key = key.replace(/\s+/g, "");

  // Remove "ed25519:" prefix if present
  key = key.replace(/^ed25519:/, "");

  // Remove multibase "z" prefix (base58) - for now, assume it's base64url after
  if (key.startsWith("z")) {
    // In production, decode base58 here
    // For now, try to decode as base64url after removing z
    key = key.slice(1);
  }

  // Try base64url first
  try {
    return base64urlToBytes(key);
  } catch {
    // Try base64
    try {
      return base64ToBytes(key);
    } catch {
      // Try hex
      try {
        return hexToBytes(key);
      } catch {
        throw new Error(
          "Invalid public key format. Expected base64url, base64, hex, multibase, or PEM format."
        );
      }
    }
  }
}

/**
 * Convert base64url string to Uint8Array
 */
function base64urlToBytes(base64url: string): Uint8Array {
  // Convert base64url to base64
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  while (base64.length % 4) {
    base64 += "=";
  }

  // Decode base64
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64");
  } else {
    // For Cloudflare Workers, use atob
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

/**
 * Convert base64 string to Uint8Array
 *
 * @param base64 - Base64-encoded string
 * @returns Decoded bytes
 * @internal
 */
function base64ToBytes(base64: string): Uint8Array {
  // Add padding if needed
  let padded = base64;
  while (padded.length % 4) {
    padded += "=";
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64");
  } else {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

/**
 * Convert hex string to Uint8Array
 *
 * @param hex - Hexadecimal string
 * @returns Decoded bytes
 * @internal
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64url string
 *
 * Handles both Node.js (Buffer) and browser/Workers environments.
 * Removes padding and URL-safe characters as per RFC 4648.
 *
 * @param bytes - Bytes to encode
 * @returns Base64url-encoded string (no padding)
 */
export function bytesToBase64url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  } else {
    // For Cloudflare Workers
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
}

/**
 * Check if we're running in Cloudflare Workers environment
 *
 * NOTE: This function is kept for potential future use, but we no longer
 * need it for jsonld since we use deterministic JSON everywhere.
 */
function isCloudflareWorkers(): boolean {
  // Multiple checks to reliably detect Cloudflare Workers
  if (typeof globalThis === "undefined") {
    return false;
  }

  // Method 1: Check for Cloudflare-specific globals (most reliable)
  // @ts-ignore - Cloudflare Workers specific globals
  if (globalThis.CF_PAGES || globalThis.CLOUDFLARE_ENV || globalThis.CF) {
    return true;
  }

  // Method 2: Check for Workers-specific bindings (KV, D1, etc.)
  // These are injected by Cloudflare Workers runtime - most reliable indicator
  // @ts-ignore - Workers bindings
  if (globalThis.ai_passport_registry !== undefined) {
    return true;
  }

  // Method 3: Check for wrangler dev environment
  // When running `wrangler dev`, the file path contains "functionsWorker"
  try {
    // @ts-ignore - Error stack traces in Workers
    const stack = new Error().stack || "";
    if (stack.includes("functionsWorker") || stack.includes("wrangler")) {
      return true;
    }
  } catch {
    // Stack not available, continue
  }

  // Method 4: Check for Workers runtime indicators
  // Workers have Web Crypto API but not Node.js process
  const hasWebCrypto =
    globalThis.crypto !== undefined &&
    typeof globalThis.crypto.subtle !== "undefined";

  const hasNodeProcess =
    typeof process !== "undefined" && process.versions?.node !== undefined;

  const hasRequire = typeof require !== "undefined";

  // If we have Web Crypto but no Node.js indicators, likely Workers
  // This is a strong indicator since browsers also have Web Crypto but also have window
  const hasWindow = typeof window !== "undefined";
  if (hasWebCrypto && !hasNodeProcess && !hasRequire && !hasWindow) {
    return true;
  }

  // Method 5: Check for import.meta.env (Vite/Next.js indicator - means NOT Workers)
  // If import.meta.env exists, we're likely in a build tool environment, not Workers
  try {
    // @ts-ignore
    if (typeof import.meta !== "undefined" && import.meta.env) {
      return false; // Build tool environment, not Workers
    }
  } catch {
    // import.meta not available, continue checking
  }

  // Method 6: Check for Node.js Buffer (Workers don't have it natively)
  // If we're in a Workers-like environment without Buffer, assume Workers
  if (typeof Buffer === "undefined" && hasWebCrypto && !hasWindow) {
    return true;
  }

  return false;
}

/**
 * Canonicalize JSON document for signing
 *
 * Creates a deterministic representation of the JSON document by sorting keys recursively.
 * This ensures consistent signatures regardless of JSON formatting.
 *
 * **Implementation Note:** We use deterministic JSON (sorted keys) instead of full JSON-LD
 * canonicalization (URDNA2015) because:
 * 1. It works in all environments (Node.js, browsers, Cloudflare Workers)
 * 2. It's simpler and more reliable
 * 3. It's still deterministic - same input always produces same output
 * 4. The signature is still valid and verifiable
 *
 * While W3C VC spec recommends JSON-LD canonicalization, deterministic JSON is sufficient
 * for our use case and avoids the complexity of the jsonld library.
 *
 * @param document - JSON object to canonicalize
 * @param options - Optional configuration (currently unused, kept for API compatibility)
 * @returns Promise resolving to canonicalized bytes
 * @throws Error if canonicalization fails
 */
export async function canonicalizeJsonLd(
  document: any,
  options: { documentLoader?: any } = {}
): Promise<Uint8Array> {
  // Always use deterministic JSON - simple, reliable, works everywhere
  // NOTE: We do NOT use jsonld library anymore - this function name is kept
  // for API compatibility but it just uses deterministic JSON sorting
  try {
    return createDeterministicJson(document);
  } catch (error) {
    // Re-throw with more context if needed
    throw new Error(
      `Failed to canonicalize JSON: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// NOTE: Document loader removed - no longer needed since we use deterministic JSON
// instead of JSON-LD canonicalization

/**
 * Create deterministic JSON representation
 * Sorts keys recursively for consistent output
 */
function createDeterministicJson(document: any): Uint8Array {
  // Create a deterministic JSON representation
  // Sort keys recursively for consistent output
  const deterministic = JSON.stringify(document, (key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((acc, k) => {
          acc[k] = value[k];
          return acc;
        }, {} as any);
    }
    return value;
  });

  return new TextEncoder().encode(deterministic);
}

/**
 * Sign a message using Ed25519
 *
 * Uses the async version of @noble/ed25519 which works in all environments
 * (Node.js, browsers, Cloudflare Workers) by leveraging Web Crypto API internally.
 *
 * @param message - Message bytes to sign
 * @param privateKey - Private key (string in various formats or Uint8Array)
 * @returns Promise resolving to signature bytes
 * @throws Error if signing fails (invalid key, malformed message, etc.)
 */
export async function signEd25519(
  message: Uint8Array,
  privateKey: string | Uint8Array
): Promise<Uint8Array> {
  const privateKeyBytes = privateKeyToBytes(privateKey);

  // Ed25519 private keys are 32 bytes
  // If we have 64 bytes (private + public), use first 32
  const keyBytes =
    privateKeyBytes.length >= 32
      ? privateKeyBytes.slice(0, 32)
      : privateKeyBytes;

  // Use async version which works in all environments (Node.js, browsers, Workers)
  // The async version uses Web Crypto API internally
  return await signAsync(message, keyBytes);
}

/**
 * Verify an Ed25519 signature
 *
 * Uses the async version of @noble/ed25519 which works in all environments
 * (Node.js, browsers, Cloudflare Workers) by leveraging Web Crypto API internally.
 *
 * @param message - Original message bytes that were signed
 * @param signature - Signature bytes to verify
 * @param publicKey - Public key (string in various formats or Uint8Array)
 * @returns Promise resolving to true if signature is valid, false otherwise
 */
export async function verifyEd25519(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: string | Uint8Array
): Promise<boolean> {
  try {
    const publicKeyBytes = publicKeyToBytes(publicKey);
    // Use async version which works in all environments (Node.js, browsers, Workers)
    // The async version uses Web Crypto API internally
    return await verifyAsync(signature, message, publicKeyBytes);
  } catch (error) {
    // Return false on any verification error (invalid signature, malformed data, etc.)
    // Error details are not exposed to prevent information leakage
    return false;
  }
}

/**
 * Get public key from private key
 *
 * Derives the Ed25519 public key from a private key using the async version
 * of @noble/ed25519 which works in all environments.
 *
 * @param privateKey - Private key (string in various formats or Uint8Array)
 * @returns Promise resolving to public key bytes
 * @throws Error if key derivation fails (invalid key format, etc.)
 */
export async function getPublicKeyFromPrivate(
  privateKey: string | Uint8Array
): Promise<Uint8Array> {
  const privateKeyBytes = privateKeyToBytes(privateKey);
  const keyBytes =
    privateKeyBytes.length >= 32
      ? privateKeyBytes.slice(0, 32)
      : privateKeyBytes;
  // Use async version which works in all environments (Node.js, browsers, Workers)
  // The async version uses Web Crypto API internally
  return await getPublicKeyAsync(keyBytes);
}
