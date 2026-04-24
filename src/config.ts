import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

export interface AgentConfig {
  model?: string;
  description?: string;
  prompt?: string;
  temperature?: number;
  top_p?: number;
  steps?: number;
  maxSteps?: number;
  disable?: boolean;
  mode?: string;
  hidden?: boolean;
  color?: string;
  permission?: Record<string, unknown>;
  tools?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Profile {
  model?: string;
  small_model?: string;
  agent?: Record<string, AgentConfig>;
}

export interface ProfilesFile {
  profiles: Record<string, Profile>;
}

export interface OpenCodeConfig {
  model?: string;
  small_model?: string;
  agent?: Record<string, AgentConfig>;
  [key: string]: unknown;
}

const PROFILES_FILENAMES = [
  "opencode.profiles.json",
  "opencode.profiles.jsonc",
];

const CONFIG_FILENAMES = [
  "opencode.json",
  "opencode.jsonc",
];

export function stripJsonc(content: string): string {
  let result = "";
  let i = 0;
  while (i < content.length) {
    if (content[i] === '"') {
      let j = i + 1;
      while (j < content.length && content[j] !== '"') {
        if (content[j] === "\\") j++;
        j++;
      }
      result += content.slice(i, j + 1);
      i = j + 1;
    } else if (content[i] === "/" && content[i + 1] === "/") {
      while (i < content.length && content[i] !== "\n") i++;
    } else if (content[i] === "/" && content[i + 1] === "*") {
      i += 2;
      while (i < content.length && !(content[i] === "*" && content[i + 1] === "/")) i++;
      i += 2;
    } else {
      result += content[i];
      i++;
    }
  }
  return result;
}

export function parseJsonc(content: string): unknown {
  return JSON.parse(stripJsonc(content));
}

export async function findProfilesFile(cwd: string): Promise<string | null> {
  return findNearestFile(cwd, PROFILES_FILENAMES);
}

export async function findConfigFile(cwd: string): Promise<string | null> {
  return findNearestFile(cwd, CONFIG_FILENAMES);
}

function findNearestFile(startDir: string, filenames: string[]): string | null {
  let current = startDir;
  while (true) {
    for (const name of filenames) {
      const candidate = join(current, name);
      if (existsSync(candidate)) return candidate;
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export async function loadProfiles(cwd: string): Promise<ProfilesFile> {
  const filePath = await findProfilesFile(cwd);
  if (!filePath) {
    throw new Error(
      `No profiles file found in ${cwd}. Expected: opencode.profiles.json`
    );
  }
  const content = await readFile(filePath, "utf-8");
  const data = parseJsonc(content) as ProfilesFile;
  if (!data.profiles || typeof data.profiles !== "object") {
    throw new Error(`Invalid profiles file: missing "profiles" key`);
  }
  return data;
}

export async function loadConfig(cwd: string): Promise<OpenCodeConfig> {
  const filePath = await findConfigFile(cwd);
  if (!filePath) return {};
  const content = await readFile(filePath, "utf-8");
  return parseJsonc(content) as OpenCodeConfig;
}

export function getHomeConfigDir(): string {
  const platform = process.platform;
  if (platform === "win32") {
    return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "opencode");
  }
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "opencode");
}
