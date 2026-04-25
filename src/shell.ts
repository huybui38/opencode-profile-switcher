import { basename } from "node:path";

export type ShellKind = "bash" | "zsh" | "sh" | "fish" | "powershell" | "cmd";

export function detectShell(env: NodeJS.ProcessEnv = process.env, platform = process.platform): ShellKind {
  const shellPath = (env.SHELL || "").toLowerCase();
  const shellName = basename(shellPath || "").toLowerCase();
  const comspec = (env.ComSpec || "").toLowerCase();

  if (shellName.includes("fish")) return "fish";
  if (shellName.includes("zsh")) return "zsh";
  if (shellName.includes("bash")) return "bash";
  if (shellName === "sh" || shellName.includes("dash") || shellName.includes("ksh")) return "sh";

  if (shellPath.includes("pwsh") || shellPath.includes("powershell")) return "powershell";
  if (comspec.includes("pwsh") || comspec.includes("powershell")) return "powershell";

  if (platform === "win32") {
    if (env.PSModulePath && env.PSExecutionPolicyPreference) return "powershell";
    return "cmd";
  }

  return "sh";
}

export function formatExportCommand(shell: ShellKind, value: string): string {
  if (shell === "powershell") {
    const escaped = value.replace(/'/g, "''");
    return `$env:OPENCODE_CONFIG_CONTENT = '${escaped}'`;
  }

  if (shell === "cmd") {
    const escaped = value.replace(/"/g, '""');
    return `set "OPENCODE_CONFIG_CONTENT=${escaped}"`;
  }

  if (shell === "fish") {
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`");
    return `set -gx OPENCODE_CONFIG_CONTENT \"${escaped}\"`;
  }

  const escaped = value.replace(/'/g, `'"'"'`);
  return `export OPENCODE_CONFIG_CONTENT='${escaped}'`;
}

export function clearCommand(shell: ShellKind): string {
  if (shell === "powershell") return "Remove-Item Env:OPENCODE_CONFIG_CONTENT";
  if (shell === "cmd") return "set OPENCODE_CONFIG_CONTENT=";
  if (shell === "fish") return "set -e OPENCODE_CONFIG_CONTENT";
  return "unset OPENCODE_CONFIG_CONTENT";
}
