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

  const modelOnlyAgent = extractModelOnlyAgentConfig(expanded.agent);
  if (Object.keys(modelOnlyAgent).length > 0) {
    const mergedAgent: Record<string, AgentConfig> = {
      ...(baseConfig.agent || {}),
    };
    for (const [name, config] of Object.entries(modelOnlyAgent)) {
      mergedAgent[name] = {
        ...(mergedAgent[name] || {}),
        model: config.model,
      };
    }
    merged.agent = mergedAgent;
  }

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

  const modelOnlyAgent = extractModelOnlyAgentConfig(expanded.agent);
  if (Object.keys(modelOnlyAgent).length > 0) {
    overrides.agent = modelOnlyAgent;
  }

  return overrides;
}

function extractModelOnlyAgentConfig(
  agentConfigs: Record<string, AgentConfig>
): Record<string, { model: string }> {
  const out: Record<string, { model: string }> = {};
  for (const [name, config] of Object.entries(agentConfigs)) {
    if (typeof config.model === "string" && config.model.length > 0) {
      out[name] = { model: config.model };
    }
  }
  return out;
}
