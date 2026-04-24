import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { loadProfiles, loadConfig } from "../src/config.js";
import { discoverAgents } from "../src/discover.js";
import { expandWildcards } from "../src/expand.js";
import { mergeProfile, extractProfileOverrides } from "../src/merge.js";

const FIXTURE_DIR = resolve(__dirname, "fixtures/test-profile");

describe("integration: test-profile fixture", () => {
  it("loads profiles from fixture", async () => {
    const profiles = await loadProfiles(FIXTURE_DIR);
    expect(Object.keys(profiles.profiles)).toContain("research-heavy");
    expect(Object.keys(profiles.profiles)).toContain("fast-cheap");
  });

  it("loads base config from fixture", async () => {
    const config = await loadConfig(FIXTURE_DIR);
    expect(config.model).toBe("anthropic/claude-sonnet-4");
    expect(Object.keys(config.agent || {})).toContain("build");
  });

  it("discovers agents from config and markdown files", async () => {
    const config = await loadConfig(FIXTURE_DIR);
    const agents = await discoverAgents(FIXTURE_DIR, config);
    expect(agents).toContain("build");
    expect(agents).toContain("plan");
    expect(agents).toContain("researcher/agent-a");
    expect(agents).toContain("researcher/agent-b");
    expect(agents).toContain("reviewer/agent-c");
    expect(agents).toContain("custom-reviewer");
    expect(agents).toContain("researcher/deep-agent");
  });

  it("finds config and profile files from nested directories", async () => {
    const nestedDir = resolve(FIXTURE_DIR, "src/feature/module");
    const profiles = await loadProfiles(nestedDir);
    const config = await loadConfig(nestedDir);
    expect(Object.keys(profiles.profiles)).toContain("research-heavy");
    expect(config.model).toBe("anthropic/claude-sonnet-4");

    const agents = await discoverAgents(nestedDir, config);
    expect(agents).toContain("custom-reviewer");
    expect(agents).toContain("researcher/deep-agent");
  });

  it("resolves research-heavy profile with wildcard expansion", async () => {
    const [profiles, baseConfig] = await Promise.all([
      loadProfiles(FIXTURE_DIR),
      loadConfig(FIXTURE_DIR),
    ]);
    const profile = profiles.profiles["research-heavy"];
    const agents = await discoverAgents(FIXTURE_DIR, baseConfig);
    const expanded = expandWildcards(profile, agents);

    expect(expanded.agent["researcher/agent-a"].model).toBe("anthropic/claude-opus-4.6");
    expect(expanded.agent["researcher/agent-b"].model).toBe("anthropic/claude-opus-4.6");
    expect(expanded.agent["reviewer/agent-c"].model).toBe("opencode-go/glm-5");
  });

  it("resolves fast-cheap profile without wildcards", async () => {
    const [profiles, baseConfig] = await Promise.all([
      loadProfiles(FIXTURE_DIR),
      loadConfig(FIXTURE_DIR),
    ]);
    const profile = profiles.profiles["fast-cheap"];
    const agents = await discoverAgents(FIXTURE_DIR, baseConfig);
    const expanded = expandWildcards(profile, agents);

    expect(expanded.agent["build"].model).toBe("anthropic/claude-haiku-4-20250514");
  });

  it("merges profile into base config preserving non-conflicting keys", async () => {
    const [profiles, baseConfig] = await Promise.all([
      loadProfiles(FIXTURE_DIR),
      loadConfig(FIXTURE_DIR),
    ]);
    const profile = profiles.profiles["research-heavy"];
    const agents = await discoverAgents(FIXTURE_DIR, baseConfig);
    const expanded = expandWildcards(profile, agents);
    const merged = mergeProfile(baseConfig, profile, expanded);

    expect(merged.model).toBe("anthropic/claude-opus-4.6");
    expect(merged.agent?.["plan"].mode).toBe("primary");
    expect(merged.agent?.["researcher/agent-a"].model).toBe("anthropic/claude-opus-4.6");
  });

  it("extracts overrides for env var injection", async () => {
    const [profiles, baseConfig] = await Promise.all([
      loadProfiles(FIXTURE_DIR),
      loadConfig(FIXTURE_DIR),
    ]);
    const profile = profiles.profiles["research-heavy"];
    const agents = await discoverAgents(FIXTURE_DIR, baseConfig);
    const expanded = expandWildcards(profile, agents);
    const overrides = extractProfileOverrides(profile, expanded);

    expect(overrides.model).toBe("anthropic/claude-opus-4.6");
    expect(Object.keys(overrides.agent as Record<string, unknown>)).toEqual([
      "researcher/agent-a",
      "researcher/agent-b",
      "researcher/deep-agent",
      "reviewer/agent-c",
    ]);
  });
});
