/**
 * Schema validators for OAP conformance testing
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";

export class SchemaValidator {
  private ajv: Ajv;
  private passportSchema: any;
  private decisionSchema: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    // Use fallback schemas for now
    this.passportSchema = this.getFallbackPassportSchema();
    this.decisionSchema = this.getFallbackDecisionSchema();
  }

  async validatePassport(
    passport: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const validate = this.ajv.compile(this.passportSchema);
    const valid = validate(passport);

    if (!valid) {
      const errors = validate.errors?.map(
        (err) => `${err.instancePath || "root"}: ${err.message}`
      ) || ["Unknown validation error"];
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  async validateDecision(
    decision: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const validate = this.ajv.compile(this.decisionSchema);
    const valid = validate(decision);

    if (!valid) {
      const errors = validate.errors?.map(
        (err) => `${err.instancePath || "root"}: ${err.message}`
      ) || ["Unknown validation error"];
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  async validateContext(
    packId: string,
    context: any
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic context validation based on pack ID
    switch (packId) {
      case "payments.refund.v1":
        if (!context.amount || typeof context.amount !== "number") {
          errors.push("amount is required and must be a number");
        }
        if (!context.currency || typeof context.currency !== "string") {
          errors.push("currency is required and must be a string");
        }
        if (!context.order_id || typeof context.order_id !== "string") {
          errors.push("order_id is required and must be a string");
        }
        break;

      case "data.export.v1":
        if (!context.collection || typeof context.collection !== "string") {
          errors.push("collection is required and must be a string");
        }
        if (
          context.estimated_rows &&
          typeof context.estimated_rows !== "number"
        ) {
          errors.push("estimated_rows must be a number");
        }
        break;

      case "repo.release.publish.v1":
        if (!context.repo || typeof context.repo !== "string") {
          errors.push("repo is required and must be a string");
        }
        if (!context.branch || typeof context.branch !== "string") {
          errors.push("branch is required and must be a string");
        }
        if (!context.tag || typeof context.tag !== "string") {
          errors.push("tag is required and must be a string");
        }
        break;

      default:
        errors.push(`Unknown policy pack: ${packId}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getFallbackPassportSchema(): any {
    return {
      type: "object",
      required: [
        "passport_id",
        "kind",
        "spec_version",
        "owner_id",
        "owner_type",
        "status",
        "assurance_level",
        "capabilities",
        "limits",
        "regions",
        "created_at",
        "updated_at",
        "version",
      ],
      properties: {
        passport_id: { type: "string", format: "uuid" },
        kind: { type: "string", enum: ["template", "instance"] },
        spec_version: { type: "string", const: "oap/1.0" },
        owner_id: { type: "string" },
        owner_type: { type: "string", enum: ["org", "user"] },
        assurance_level: {
          type: "string",
          enum: ["L0", "L1", "L2", "L3", "L4KYC", "L4FIN"],
        },
        status: {
          type: "string",
          enum: ["draft", "active", "suspended", "revoked"],
        },
        capabilities: { type: "array" },
        limits: { type: "object" },
        regions: { type: "array" },
        created_at: { type: "string", format: "date-time" },
        updated_at: { type: "string", format: "date-time" },
        version: { type: "string" },
      },
    };
  }

  private getFallbackDecisionSchema(): any {
    return {
      type: "object",
      required: [
        "decision_id",
        "policy_id",
        "agent_id",
        "owner_id",
        "assurance_level",
        "allow",
        "reasons",
        "created_at",
        "expires_in",
        "passport_digest",
        "signature",
        "kid",
      ],
      properties: {
        decision_id: { type: "string", format: "uuid" },
        policy_id: { type: "string" },
        agent_id: { type: "string", format: "uuid" },
        owner_id: { type: "string" },
        assurance_level: {
          type: "string",
          enum: ["L0", "L1", "L2", "L3", "L4KYC", "L4FIN"],
        },
        allow: { type: "boolean" },
        reasons: { type: "array" },
        created_at: { type: "string", format: "date-time" },
        expires_in: { type: "integer", minimum: 0 },
        passport_digest: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
        signature: { type: "string", pattern: "^ed25519:[A-Za-z0-9+/=]+$" },
        kid: { type: "string" },
      },
    };
  }
}
