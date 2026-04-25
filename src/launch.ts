import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { OpenCodeConfig } from "./config.js";

export async function writeToConfig(
  cwd: string,
  config: OpenCodeConfig
): Promise<void> {
  const targetPath = join(cwd, "opencode.json");
  await writeFile(targetPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
