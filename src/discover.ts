import { readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { existsSync } from "node:fs";
import type { OpenCodeConfig } from "./config.js";
import { getHomeConfigDir } from "./config.js";

export async function discoverAgents(cwd: string, config: OpenCodeConfig): Promise<string[]> {
  const agentSet = new Set<string>();

  if (config.agent && typeof config.agent === "object") {
    for (const name of Object.keys(config.agent)) {
      agentSet.add(name);
    }
  }

  const projectAgentDirs = collectProjectAgentDirs(cwd);
  const globalAgentDirs = [
    join(getHomeConfigDir(), "agents"),
    join(getHomeConfigDir(), "agent"),
  ];
  const agentDirs = [...projectAgentDirs, ...globalAgentDirs];

  for (const dir of agentDirs) {
    const agents = await scanAgentDir(dir);
    for (const a of agents) agentSet.add(a);
  }

  return Array.from(agentSet).sort();
}

async function scanAgentDir(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  try {
    const agents: string[] = [];
    await walkAgentDir(dir, dir, agents);
    return agents;
  } catch {
    return [];
  }
}

async function walkAgentDir(root: string, currentDir: string, acc: string[]): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walkAgentDir(root, fullPath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md") && !entry.name.endsWith(".txt")) continue;
    const rel = relative(root, fullPath);
    const normalized = rel.split(sep).join("/");
    const withoutExt = normalized.replace(/\.(md|txt)$/i, "");
    acc.push(withoutExt);
  }
}

function collectProjectAgentDirs(cwd: string): string[] {
  const dirs: string[] = [];
  const seen = new Set<string>();
  let current = cwd;
  while (true) {
    const candidates = [
      join(current, ".opencode", "agents"),
      join(current, ".opencode", "agent"),
    ];
    for (const candidate of candidates) {
      if (!seen.has(candidate) && existsSync(candidate)) {
        seen.add(candidate);
        dirs.push(candidate);
      }
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dirs;
}
