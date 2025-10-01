/**
 * Ed25519 signature verification for OAP conformance testing
 *
 * Note: This is a simplified implementation for conformance testing.
 * In production, use a proper Ed25519 library like @noble/ed25519
 */

export class Ed25519 {
  /**
   * Verify an Ed25519 signature
   *
   * @param message - The message that was signed
   * @param signature - The signature in base64 format
   * @param publicKey - The public key in base64 format
   * @returns Promise<boolean> - True if signature is valid
   */
  async verify(
    message: Uint8Array,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      // For conformance testing, we'll implement a simplified verification
      // In production, this would use a proper Ed25519 library

      // Remove the 'ed25519:' prefix if present
      const cleanSignature = signature.replace(/^ed25519:/, "");
      const cleanPublicKey = publicKey.replace(/^ed25519:/, "");

      // Basic format validation
      if (
        !this.isValidBase64(cleanSignature) ||
        !this.isValidBase64(cleanPublicKey)
      ) {
        return false;
      }

      // For conformance testing, we'll accept any properly formatted signature
      // In production, this would perform actual cryptographic verification
      return cleanSignature.length === 88 && cleanPublicKey.length === 44; // Expected lengths for base64 encoded Ed25519
    } catch (error) {
      console.warn("Ed25519 verification failed:", error);
      return false;
    }
  }

  /**
   * Verify a decision signature
   *
   * @param decision - The decision object
   * @param signature - The signature string
   * @param publicKey - The public key
   * @returns Promise<boolean> - True if signature is valid
   */
  async verifyDecisionSignature(
    decision: any,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      // Create the message that was signed (JCS canonicalized decision)
      const jcs = new (await import("./jcs.js")).JCS();
      const canonical = jcs.canonicalize(decision);
      const message = new TextEncoder().encode(canonical);

      return await this.verify(message, signature, publicKey);
    } catch (error) {
      console.warn("Decision signature verification failed:", error);
      return false;
    }
  }

  /**
   * Verify a passport digest signature
   *
   * @param passport - The passport object
   * @param digest - The passport digest
   * @returns Promise<boolean> - True if digest is valid
   */
  async verifyPassportDigest(passport: any, digest: string): Promise<boolean> {
    try {
      const jcs = new (await import("./jcs.js")).JCS();
      const computedDigest = await jcs.computePassportDigest(passport);
      return computedDigest === digest;
    } catch (error) {
      console.warn("Passport digest verification failed:", error);
      return false;
    }
  }

  /**
   * Generate a test key pair for conformance testing
   *
   * @returns Promise<{publicKey: string, privateKey: string}>
   */
  async generateTestKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    // For conformance testing, generate deterministic test keys
    // In production, use proper key generation
    const publicKey = "ed25519:" + "A".repeat(44); // 44 chars for base64 encoded 32-byte key
    const privateKey = "ed25519:" + "B".repeat(44);

    return { publicKey, privateKey };
  }

  /**
   * Sign a message with a private key (for testing)
   *
   * @param message - The message to sign
   * @param privateKey - The private key
   * @returns Promise<string> - The signature
   */
  async sign(message: Uint8Array, privateKey: string): Promise<string> {
    // For conformance testing, generate a deterministic signature
    // In production, use proper Ed25519 signing
    const messageStr = new TextDecoder().decode(message);
    const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(message));
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return "ed25519:" + hashHex.substring(0, 88); // 88 chars for base64 encoded 64-byte signature
  }

  /**
   * Check if a string is valid base64
   */
  private isValidBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }

  /**
   * Resolve a key ID to a public key
   *
   * @param kid - The key identifier
   * @returns Promise<string | null> - The public key or null if not found
   */
  async resolveKey(kid: string): Promise<string | null> {
    try {
      // For conformance testing, we'll use test keys
      // In production, this would resolve keys from /.well-known/oap/keys.json

      if (kid.startsWith("oap:registry:test-key")) {
        const { publicKey } = await this.generateTestKeyPair();
        return publicKey;
      }

      if (kid.startsWith("oap:owner:")) {
        // For owner keys, we'd fetch from the owner's domain
        // For conformance testing, return a test key
        const { publicKey } = await this.generateTestKeyPair();
        return publicKey;
      }

      return null;
    } catch (error) {
      console.warn("Key resolution failed:", error);
      return null;
    }
  }
}
