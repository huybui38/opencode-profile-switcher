import { describe, it, expect } from "vitest";
import { mergeProfile, extractProfileOverrides } from "../src/merge.js";
import type { OpenCodeConfig, Profile, AgentConfig } from "../src/config.js";
import type { ExpandResult } from "../src/expand.js";

describe("mergeProfile", () => {
  it("overrides model from profile", () => {
    const base: OpenCodeConfig = { model: "anthropic/claude-sonnet-4" };
    const profile: Profile = { model: "anthropic/claude-opus-4.6" };
    const expanded: ExpandResult = { agent: {} };

    const result = mergeProfile(base, profile, expanded);
    expect(result.model).toBe("anthropic/claude-opus-4.6");
  });

  it("overrides small_model from profile", () => {
    const base: OpenCodeConfig = { small_model: "anthropic/claude-haiku-4" };
    const profile: Profile = { small_model: "openai/gpt-4o-mini" };
    const expanded: ExpandResult = { agent: {} };

    const result = mergeProfile(base, profile, expanded);
    expect(result.small_model).toBe("openai/gpt-4o-mini");
  });

  it("merges expanded agent config with base agent config", () => {
    const base: OpenCodeConfig = {
      agent: {
        build: { model: "anthropic/claude-sonnet-4" },
        plan: { model: "anthropic/claude-haiku-4" },
      },
    };
    const profile: Profile = {};
    const expanded: ExpandResult = {
      agent: {
        "researcher/agent-a": { model: "anthropic/claude-opus-4.6" } as AgentConfig,
      },
    };

    const result = mergeProfile(base, profile, expanded);
    expect(result.agent?.["build"].model).toBe("anthropic/claude-sonnet-4");
    expect(result.agent?.["plan"].model).toBe("anthropic/claude-haiku-4");
    expect(result.agent?.["researcher/agent-a"].model).toBe("anthropic/claude-opus-4.6");
  });

  it("expanded agent config overrides base agent config for same key", () => {
    const base: OpenCodeConfig = {
      agent: {
        build: { model: "anthropic/claude-sonnet-4" },
      },
    };
    const profile: Profile = {};
    const expanded: ExpandResult = {
      agent: {
        build: { model: "anthropic/claude-opus-4.6" } as AgentConfig,
      },
    };

    const result = mergeProfile(base, profile, expanded);
    expect(result.agent?.["build"].model).toBe("anthropic/claude-opus-4.6");
  });

  it("preserves non-conflicting base config", () => {
    const base: OpenCodeConfig = {
      model: "anthropic/claude-sonnet-4",
      autoupdate: true,
      agent: { build: { model: "anthropic/claude-sonnet-4" } },
    };
    const profile: Profile = { model: "anthropic/claude-opus-4.6" };
    const expanded: ExpandResult = { agent: {} };

    const result = mergeProfile(base, profile, expanded);
    expect(result.model).toBe("anthropic/claude-opus-4.6");
    expect(result.autoupdate).toBe(true);
  });
});

describe("extractProfileOverrides", () => {
  it("extracts model override", () => {
    const profile: Profile = { model: "anthropic/claude-opus-4.6" };
    const expanded: ExpandResult = { agent: {} };
    const overrides = extractProfileOverrides(profile, expanded);
    expect(overrides.model).toBe("anthropic/claude-opus-4.6");
    expect(overrides.agent).toBeUndefined();
  });

  it("extracts agent overrides", () => {
    const profile: Profile = {};
    const expanded: ExpandResult = {
      agent: {
        "researcher/agent-a": { model: "anthropic/claude-opus-4.6" },
      },
    };
    const overrides = extractProfileOverrides(profile, expanded);
    expect(overrides.agent).toEqual(expanded.agent);
    expect(overrides.model).toBeUndefined();
  });

  it("extracts both model and agent overrides", () => {
    const profile: Profile = { model: "anthropic/claude-opus-4.6", small_model: "openai/gpt-4o-mini" };
    const expanded: ExpandResult = {
      agent: { build: { model: "anthropic/claude-opus-4.6" } },
    };
    const overrides = extractProfileOverrides(profile, expanded);
    expect(overrides.model).toBe("anthropic/claude-opus-4.6");
    expect(overrides.small_model).toBe("openai/gpt-4o-mini");
    expect(overrides.agent).toBeDefined();
  });
});
