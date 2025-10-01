/**
 * JSON Canonicalization Scheme (JCS) implementation
 *
 * Implements RFC 8785 for deterministic JSON serialization
 */

export class JCS {
  /**
   * Canonicalize a JSON object according to RFC 8785
   */
  canonicalize(obj: any): string {
    return this.canonicalizeValue(obj);
  }

  private canonicalizeValue(value: any): string {
    if (value === null) {
      return "null";
    }

    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }

    if (typeof value === "number") {
      if (Number.isInteger(value)) {
        return value.toString();
      }
      return value.toString();
    }

    if (typeof value === "string") {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return this.canonicalizeArray(value);
    }

    if (typeof value === "object") {
      return this.canonicalizeObject(value);
    }

    throw new Error(`Unsupported value type: ${typeof value}`);
  }

  private canonicalizeArray(arr: any[]): string {
    const elements = arr.map((item) => this.canonicalizeValue(item));
    return "[" + elements.join(",") + "]";
  }

  private canonicalizeObject(obj: any): string {
    // Get all keys and sort them
    const keys = Object.keys(obj).sort();

    const pairs = keys.map((key) => {
      const value = this.canonicalizeValue(obj[key]);
      return JSON.stringify(key) + ":" + value;
    });

    return "{" + pairs.join(",") + "}";
  }

  /**
   * Compute SHA-256 hash of canonicalized JSON
   */
  async computeHash(obj: any): Promise<string> {
    const canonical = this.canonicalize(obj);
    const encoder = new TextEncoder();
    const data = encoder.encode(canonical);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  /**
   * Compute passport digest as specified in OAP
   */
  async computePassportDigest(passport: any): Promise<string> {
    const hash = await this.computeHash(passport);
    return `sha256:${hash}`;
  }
}
