import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OpenCodeConfig } from "./config.js";

export async function launchWithEnv(
  overrides: Record<string, unknown>,
  args: string[] = []
): Promise<void> {
  const envContent = JSON.stringify(overrides);
  const env = {
    ...process.env,
    OPENCODE_CONFIG_CONTENT: envContent,
  };

  const child = spawn("opencode", args, {
    stdio: "inherit",
    env,
  });

  return new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`opencode exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

export async function writeToConfig(
  cwd: string,
  config: OpenCodeConfig
): Promise<void> {
  const targetPath = join(cwd, "opencode.json");
  await writeFile(targetPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
