#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { loadProfiles, loadConfig } from "./config.js";
import { discoverAgents } from "./discover.js";
import { expandWildcards } from "./expand.js";
import { mergeProfile, extractProfileOverrides } from "./merge.js";
import { launchWithEnv, writeToConfig } from "./launch.js";

const program = new Command();

program
  .name("opencode-profile")
  .description("Switch OpenCode profiles with wildcard agent config expansion")
  .version("0.1.0");

program
  .command("switch")
  .description("Switch to a profile and launch opencode")
  .argument("<profile>", "Profile name from opencode.profiles.json")
  .option("--write", "Write resolved config to opencode.json instead of using env var", false)
  .option("--dry-run", "Print resolved config without launching opencode", false)
  .allowUnknownOption(true)
  .action(async (profileName: string, opts: { write: boolean; dryRun: boolean }, cmd: Command) => {
    const cwd = process.cwd();
    try {
      const [profiles, baseConfig] = await Promise.all([
        loadProfiles(cwd),
        loadConfig(cwd),
      ]);

      const profile = profiles.profiles[profileName];
      if (!profile) {
        console.error(pc.red(`Profile "${profileName}" not found.`));
        console.error(pc.dim(`Available: ${Object.keys(profiles.profiles).join(", ")}`));
        process.exit(1);
      }

      const agentNames = await discoverAgents(cwd, baseConfig);
      const expanded = expandWildcards(profile, agentNames);

      if (opts.dryRun) {
        const overrides = extractProfileOverrides(profile, expanded);
        console.log(pc.bold("Resolved config overrides:"));
        console.log(JSON.stringify(overrides, null, 2));
        console.log();
        console.log(pc.dim(`Discovered agents: ${agentNames.join(", ") || "(none)"}`));
        console.log(pc.dim(`Expanded wildcard agents: ${Object.keys(expanded.agent).join(", ") || "(none)"}`));
        return;
      }

      if (opts.write) {
        const merged = mergeProfile(baseConfig, profile, expanded);
        await writeToConfig(cwd, merged);
        console.log(pc.green(`Profile "${profileName}" written to opencode.json`));
        console.log(pc.dim(`Expanded agents: ${Object.keys(expanded.agent).join(", ")}`));
      } else {
        const overrides = extractProfileOverrides(profile, expanded);
        console.log(pc.green(`Switching to profile "${profileName}"`));
        console.log(pc.dim(`Expanded agents: ${Object.keys(expanded.agent).join(", ")}`));
        const opencodeArgs = cmd.args.slice(1);
        await launchWithEnv(overrides, opencodeArgs.length > 0 ? opencodeArgs : undefined);
      }
    } catch (err) {
      console.error(pc.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List available profiles")
  .action(async () => {
    const cwd = process.cwd();
    try {
      const profiles = await loadProfiles(cwd);
      const names = Object.keys(profiles.profiles);
      if (names.length === 0) {
        console.log(pc.dim("No profiles defined."));
        return;
      }
      console.log(pc.bold("Available profiles:"));
      for (const name of names) {
        const p = profiles.profiles[name];
        const parts: string[] = [];
        if (p.model) parts.push(`model: ${p.model}`);
        if (p.small_model) parts.push(`small_model: ${p.small_model}`);
        const agentKeys = Object.keys(p.agent || {});
        if (agentKeys.length > 0) parts.push(`agents: ${agentKeys.join(", ")}`);
        console.log(`  ${pc.cyan(name)}  ${pc.dim(parts.join(" | "))}`);
      }
    } catch (err) {
      console.error(pc.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program
  .command("agents")
  .description("List discovered agent names")
  .action(async () => {
    const cwd = process.cwd();
    try {
      const baseConfig = await loadConfig(cwd);
      const agentNames = await discoverAgents(cwd, baseConfig);
      if (agentNames.length === 0) {
        console.log(pc.dim("No agents discovered."));
        return;
      }
      console.log(pc.bold("Discovered agents:"));
      for (const name of agentNames) {
        console.log(`  ${pc.cyan(name)}`);
      }
    } catch (err) {
      console.error(pc.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program
  .command("resolve")
  .description("Resolve a profile and show what agents match wildcards")
  .argument("<profile>", "Profile name")
  .action(async (profileName: string) => {
    const cwd = process.cwd();
    try {
      const [profiles, baseConfig] = await Promise.all([
        loadProfiles(cwd),
        loadConfig(cwd),
      ]);
      const profile = profiles.profiles[profileName];
      if (!profile) {
        console.error(pc.red(`Profile "${profileName}" not found.`));
        process.exit(1);
      }
      const agentNames = await discoverAgents(cwd, baseConfig);
      const expanded = expandWildcards(profile, agentNames);
      const overrides = extractProfileOverrides(profile, expanded);

      console.log(pc.bold(`Profile: ${profileName}`));
      console.log(pc.dim(`Discovered agents: ${agentNames.join(", ")}`));
      console.log();
      console.log(pc.bold("Expanded agent configs:"));
      for (const [name, config] of Object.entries(expanded.agent)) {
        console.log(`  ${pc.cyan(name)}: ${JSON.stringify(config)}`);
      }
      console.log();
      console.log(pc.bold("Full overrides:"));
      console.log(JSON.stringify(overrides, null, 2));
    } catch (err) {
      console.error(pc.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program.parse();
