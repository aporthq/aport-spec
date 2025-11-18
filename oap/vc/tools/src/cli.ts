#!/usr/bin/env node

/**
 * OAP VC Conversion CLI Tool
 *
 * Command-line interface for converting between OAP objects and Verifiable Credentials
 */

import { Command } from "commander";
import { readFileSync, writeFileSync } from "fs";
import chalk from "chalk";
import ora from "ora";
import {
  exportPassportToVC,
  exportDecisionToVC,
  importVCToPassport,
  importVCToDecision,
  OAPPassport,
  OAPDecision,
  VerifiableCredential,
  RegistryKey,
} from "./index.js";

const program = new Command();

program
  .name("oap-vc")
  .description("Open Agent Passport VC conversion tools")
  .version("1.0.0");

// Export commands
program
  .command("export")
  .description("Export OAP objects to Verifiable Credentials")
  .option("-t, --type <type>", "Object type: passport or decision", "passport")
  .option("-i, --input <file>", "Input OAP JSON file")
  .option("-o, --output <file>", "Output VC JSON file")
  .option("-k, --key <file>", "Registry key JSON file")
  .option("-v, --verbose", "Show converted data in output", false)
  .action(async (options) => {
    const spinner = ora("Converting OAP to VC...").start();

    try {
      // Load input file
      const inputData = JSON.parse(readFileSync(options.input, "utf8"));

      // Load registry key
      const registryKey: RegistryKey = JSON.parse(
        readFileSync(options.key, "utf8")
      );

      let vc: VerifiableCredential;

      if (options.type === "passport") {
        vc = await exportPassportToVC(inputData as OAPPassport, registryKey);
      } else if (options.type === "decision") {
        vc = await exportDecisionToVC(inputData as OAPDecision, registryKey);
      } else {
        throw new Error('Invalid type. Must be "passport" or "decision"');
      }

      // Write output file
      writeFileSync(options.output, JSON.stringify(vc, null, 2));

      spinner.succeed(
        chalk.green(`Successfully exported ${options.type} to VC`)
      );
      console.log(chalk.blue(`Output written to: ${options.output}`));

      // Log the converted data if verbose flag is set
      if (options.verbose) {
        console.log(chalk.cyan("\n📄 Converted VC Data:"));
        console.log(chalk.gray("─".repeat(50)));
        console.log(JSON.stringify(vc, null, 2));
        console.log(chalk.gray("─".repeat(50)));
      }
    } catch (error) {
      spinner.fail(chalk.red("Export failed"));
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );
      process.exit(1);
    }
  });

// Import commands
program
  .command("import")
  .description("Import Verifiable Credentials to OAP objects")
  .option("-t, --type <type>", "Object type: passport or decision", "passport")
  .option("-i, --input <file>", "Input VC JSON file")
  .option("-o, --output <file>", "Output OAP JSON file")
  .option("-v, --verbose", "Show converted data in output", false)
  .action(async (options) => {
    const spinner = ora("Converting VC to OAP...").start();

    try {
      // Load input file
      const vc: VerifiableCredential = JSON.parse(
        readFileSync(options.input, "utf8")
      );

      let oapObject: OAPPassport | OAPDecision;

      if (options.type === "passport") {
        oapObject = await importVCToPassport(vc);
      } else if (options.type === "decision") {
        oapObject = await importVCToDecision(vc);
      } else {
        throw new Error('Invalid type. Must be "passport" or "decision"');
      }

      // Write output file
      writeFileSync(options.output, JSON.stringify(oapObject, null, 2));

      spinner.succeed(
        chalk.green(`Successfully imported VC to ${options.type}`)
      );
      console.log(chalk.blue(`Output written to: ${options.output}`));

      // Log the converted data if verbose flag is set
      if (options.verbose) {
        console.log(chalk.cyan(`\n📄 Converted ${options.type} Data:`));
        console.log(chalk.gray("─".repeat(50)));
        console.log(JSON.stringify(oapObject, null, 2));
        console.log(chalk.gray("─".repeat(50)));
      }
    } catch (error) {
      spinner.fail(chalk.red("Import failed"));
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );
      process.exit(1);
    }
  });

// Validate commands
program
  .command("validate")
  .description("Validate OAP objects or VCs")
  .option(
    "-t, --type <type>",
    "Object type: passport, decision, or vc",
    "passport"
  )
  .option("-i, --input <file>", "Input JSON file")
  .action(async (options) => {
    const spinner = ora("Validating...").start();

    try {
      const data = JSON.parse(readFileSync(options.input, "utf8"));

      let isValid = false;

      if (options.type === "passport") {
        isValid = data.agent_id && data.kind && data.spec_version;
      } else if (options.type === "decision") {
        isValid = data.decision_id && data.policy_id && data.agent_id;
      } else if (options.type === "vc") {
        isValid = data["@context"] && data.type && data.credentialSubject;
      } else {
        throw new Error(
          'Invalid type. Must be "passport", "decision", or "vc"'
        );
      }

      if (isValid) {
        spinner.succeed(chalk.green("Validation passed"));
      } else {
        spinner.fail(chalk.red("Validation failed"));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red("Validation failed"));
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );
      process.exit(1);
    }
  });

// Generate registry key
program
  .command("generate-key")
  .description("Generate a new registry key")
  .option("-o, --output <file>", "Output key JSON file", "registry-key.json")
  .action(async (options) => {
    const spinner = ora("Generating registry key...").start();

    try {
      // Generate a sample registry key
      const registryKey: RegistryKey = {
        issuer: "https://aport.io",
        kid: "key-" + Date.now(),
        publicKey: "placeholder-public-key",
        privateKey: "placeholder-private-key",
      };

      writeFileSync(options.output, JSON.stringify(registryKey, null, 2));

      spinner.succeed(chalk.green("Registry key generated"));
      console.log(chalk.blue(`Key written to: ${options.output}`));
      console.log(
        chalk.yellow(
          "Note: This is a placeholder key. In production, use proper Ed25519 key generation."
        )
      );
    } catch (error) {
      spinner.fail(chalk.red("Key generation failed"));
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
