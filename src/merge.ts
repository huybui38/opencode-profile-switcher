import type { AgentConfig, OpenCodeConfig, Profile } from "./config.js";
import type { ExpandResult } from "./expand.js";

export function mergeProfile(
  baseConfig: OpenCodeConfig,
  profile: Profile,
  expanded: ExpandResult
): OpenCodeConfig {
  const merged: OpenCodeConfig = { ...baseConfig };

  if (profile.model) {
    merged.model = profile.model;
  }
  if (profile.small_model) {
    merged.small_model = profile.small_model;
  }

  const mergedAgent: Record<string, AgentConfig> = {
    ...(baseConfig.agent || {}),
  };

  for (const [name, config] of Object.entries(expanded.agent)) {
    mergedAgent[name] = config;
  }

  merged.agent = mergedAgent;

  return merged;
}

export function extractProfileOverrides(
  profile: Profile,
  expanded: ExpandResult
): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};

  if (profile.model) {
    overrides.model = profile.model;
  }
  if (profile.small_model) {
    overrides.small_model = profile.small_model;
  }

  if (Object.keys(expanded.agent).length > 0) {
    overrides.agent = expanded.agent;
  }

  return overrides;
}
