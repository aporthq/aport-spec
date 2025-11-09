/**
 * Cryptographic utilities for Ed25519 signing and verification
 * 
 * Handles key conversion, signing, and verification for Verifiable Credentials
 */

import { sign, verify, getPublicKey } from "@noble/ed25519";
import * as jsonld from "jsonld";

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
 * Supports: PEM, base64, base64url, hex, multibase (z prefix), raw bytes
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
 * Canonicalize JSON-LD document
 * 
 * According to W3C VC spec, credentials must be canonicalized before signing
 * to ensure consistent signature regardless of JSON formatting.
 */
export async function canonicalizeJsonLd(
  document: any,
  options: { documentLoader?: any } = {}
): Promise<Uint8Array> {
  try {
    // Determine document loader based on environment
    let documentLoader = options.documentLoader;
    
    if (!documentLoader) {
      // Try to use appropriate document loader for the environment
      if (typeof window === "undefined" && typeof process !== "undefined" && process.versions?.node) {
        // Node.js environment
        try {
          // @ts-ignore - documentLoaders may not be in types
          documentLoader = jsonld.documentLoaders?.node?.() || jsonld.documentLoaders?.xhr?.();
        } catch {
          // Fallback to fetch-based loader
          documentLoader = async (url: string) => {
            const response = await fetch(url);
            const json = await response.json();
            return {
              contextUrl: null,
              document: json,
              documentUrl: url,
            };
          };
        }
      } else {
        // Browser or Cloudflare Workers environment
        try {
          // @ts-ignore - documentLoaders may not be in types
          documentLoader = jsonld.documentLoaders?.xhr?.();
        } catch {
          // Fallback to fetch-based loader for Cloudflare Workers
          documentLoader = async (url: string) => {
            const response = await fetch(url);
            const json = await response.json();
            return {
              contextUrl: null,
              document: json,
              documentUrl: url,
            };
          };
        }
      }
    }

    // Use JSON-LD canonicalization (URDNA2015 algorithm)
    const canonical = await jsonld.canonize(document, {
      algorithm: "URDNA2015",
      format: "application/n-quads",
      documentLoader: documentLoader,
    });
    
    // Convert canonical N-Quads to bytes
    return new TextEncoder().encode(canonical);
  } catch (error) {
    // Fallback: if JSON-LD canonicalization fails, use deterministic JSON
    // This is not ideal but provides a fallback for environments where jsonld might not work
    console.warn("JSON-LD canonicalization failed, using deterministic JSON:", error);
    
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
}

/**
 * Sign a message using Ed25519
 */
export async function signEd25519(
  message: Uint8Array,
  privateKey: string | Uint8Array
): Promise<Uint8Array> {
  const privateKeyBytes = privateKeyToBytes(privateKey);
  
  // Ed25519 private keys are 32 bytes
  // If we have 64 bytes (private + public), use first 32
  const keyBytes = privateKeyBytes.length >= 32 
    ? privateKeyBytes.slice(0, 32)
    : privateKeyBytes;
  
  return await sign(message, keyBytes);
}

/**
 * Verify an Ed25519 signature
 */
export async function verifyEd25519(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: string | Uint8Array
): Promise<boolean> {
  try {
    const publicKeyBytes = publicKeyToBytes(publicKey);
    return await verify(signature, message, publicKeyBytes);
  } catch (error) {
    console.error("Ed25519 verification error:", error);
    return false;
  }
}

/**
 * Get public key from private key
 */
export async function getPublicKeyFromPrivate(
  privateKey: string | Uint8Array
): Promise<Uint8Array> {
  const privateKeyBytes = privateKeyToBytes(privateKey);
  const keyBytes = privateKeyBytes.length >= 32 
    ? privateKeyBytes.slice(0, 32)
    : privateKeyBytes;
  return await getPublicKey(keyBytes);
}

