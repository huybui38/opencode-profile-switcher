#!/usr/bin/env node
import { dirname } from "node:path";
import { Command } from "commander";
import pc from "picocolors";
import {
  findProfilesFile,
  loadConfig,
  loadConfigAtDir,
  loadProfiles,
} from "./config.js";
import { discoverAgents } from "./discover.js";
import { expandWildcards } from "./expand.js";
import { extractProfileOverrides, mergeProfile } from "./merge.js";
import { writeToConfig } from "./launch.js";
import { clearCommand, detectShell, formatExportCommand } from "./shell.js";

const program = new Command();

program
  .name("opencode-profile")
  .description("Apply OpenCode profile with wildcard agent expansion")
  .version("0.1.0");

program
  .command("use")
  .description("Use a profile (default: patch local project opencode.json)")
  .argument("<profile>", "Profile name from opencode.profiles.json")
  .option("--env", "Print temporary shell env command instead of patching config", false)
  .option("--export-only", "Print only shell export command (for eval)", false)
  .option("--dry-run", "Print resolved payload without applying", false)
  .action(async (profileName: string, opts: { env: boolean; exportOnly: boolean; dryRun: boolean }) => {
    const cwd = process.cwd();
    try {
      const profilesFile = await findProfilesFile(cwd);
      if (!profilesFile) {
        throw new Error(`No profiles file found in ${cwd}. Expected: opencode.profiles.json`);
      }
      const projectDir = dirname(profilesFile);

      const [profiles, discoveredConfig] = await Promise.all([
        loadProfiles(cwd),
        loadConfig(cwd),
      ]);

      const profile = profiles.profiles[profileName];
      if (!profile) {
        console.error(pc.red(`Profile "${profileName}" not found.`));
        console.error(pc.dim(`Available: ${Object.keys(profiles.profiles).join(", ")}`));
        process.exit(1);
      }

      const agentNames = await discoverAgents(cwd, discoveredConfig);
      const expanded = expandWildcards(profile, agentNames);
      const overrides = extractProfileOverrides(profile, expanded);

      if (opts.dryRun) {
        console.log(pc.bold("Resolved payload:"));
        console.log(JSON.stringify(overrides, null, 2));
        console.log();
        console.log(pc.dim(`Project dir: ${projectDir}`));
        console.log(pc.dim(`Discovered agents: ${agentNames.join(", ") || "(none)"}`));
        console.log(pc.dim(`Expanded wildcard agents: ${Object.keys(expanded.agent).join(", ") || "(none)"}`));
        return;
      }

      if (!opts.env) {
        const localConfig = await loadConfigAtDir(projectDir);
        const merged = mergeProfile(localConfig, profile, expanded);
        await writeToConfig(projectDir, merged);
        console.log(pc.green(`Patched ${projectDir}/opencode.json`));
        console.log(pc.dim("Patched fields: model, small_model, and agent.*.model only"));
        console.log(pc.dim("No global config files were modified."));
        return;
      }

      const payload = JSON.stringify(overrides);
      const shell = detectShell();
      const command = formatExportCommand(shell, payload);
      const clear = clearCommand(shell);

      if (opts.exportOnly) {
        console.log(command);
        return;
      }

      console.log(pc.bold(`Detected shell: ${shell}`));
      console.log(pc.bold("Run this in your current shell (temporary):"));
      console.log(command);
      console.log(pc.dim(`Auto-apply: eval "$(./cli use ${profileName} --env --export-only)"`));
      console.log();
      console.log(pc.dim("This only affects the current shell session."));
      console.log(pc.dim(`Use \`${clear}\` to clear it.`));
      console.log(pc.dim("Payload fields: model, small_model, and agent.*.model only"));
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

program.parse();
