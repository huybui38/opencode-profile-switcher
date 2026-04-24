import { minimatch } from "minimatch";
import type { AgentConfig, Profile } from "./config.js";

export interface ExpandResult {
  agent: Record<string, AgentConfig>;
}

export function expandWildcards(
  profile: Profile,
  agentNames: string[]
): ExpandResult {
  const result: Record<string, AgentConfig> = {};
  const entries = Object.entries(profile.agent || {});

  const exactNames = new Set(agentNames);

  const wildcardEntries: [string, AgentConfig][] = [];
  const exactEntries: [string, AgentConfig][] = [];

  for (const [pattern, config] of entries) {
    if (isWildcard(pattern)) {
      wildcardEntries.push([pattern, config]);
    } else {
      exactEntries.push([pattern, config]);
    }
  }

  for (const [pattern, config] of wildcardEntries) {
    const matches = agentNames.filter((name) => minimatch(name, pattern));
    for (const name of matches) {
      result[name] = { ...config };
    }
    const nonMatchingExact = matches.length === 0;
    if (nonMatchingExact) {
      result[pattern] = { ...config };
    }
  }

  for (const [name, config] of exactEntries) {
    result[name] = { ...config };
  }

  for (const [pattern, config] of wildcardEntries) {
    if (exactNames.has(pattern) && !result[pattern]) {
      result[pattern] = { ...config };
    }
  }

  return { agent: result };
}

function isWildcard(key: string): boolean {
  return key.includes("*") || key.includes("?") || key.includes("[") || key.includes("{");
}
