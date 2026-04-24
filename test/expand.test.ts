import { describe, it, expect } from "vitest";
import { expandWildcards } from "../src/expand.js";
import type { Profile } from "../src/config.js";

describe("expandWildcards", () => {
  it("expands researcher/* to matching agent names", () => {
    const profile: Profile = {
      agent: {
        "researcher/*": { model: "anthropic/claude-opus-4.6" },
      },
    };
    const agentNames = [
      "researcher/agent-a",
      "researcher/agent-b",
      "reviewer/agent-c",
    ];

    const result = expandWildcards(profile, agentNames);
    expect(result.agent["researcher/agent-a"]).toEqual({ model: "anthropic/claude-opus-4.6" });
    expect(result.agent["researcher/agent-b"]).toEqual({ model: "anthropic/claude-opus-4.6" });
    expect(result.agent["reviewer/agent-c"]).toBeUndefined();
  });

  it("expands multiple wildcard patterns", () => {
    const profile: Profile = {
      agent: {
        "researcher/*": { model: "anthropic/claude-opus-4.6" },
        "reviewer/*": { model: "opencode-go/glm-5" },
      },
    };
    const agentNames = [
      "researcher/agent-a",
      "reviewer/agent-c",
      "reviewer/agent-d",
    ];

    const result = expandWildcards(profile, agentNames);
    expect(result.agent["researcher/agent-a"].model).toBe("anthropic/claude-opus-4.6");
    expect(result.agent["reviewer/agent-c"].model).toBe("opencode-go/glm-5");
    expect(result.agent["reviewer/agent-d"].model).toBe("opencode-go/glm-5");
  });

  it("exact config takes precedence over wildcard", () => {
    const profile: Profile = {
      agent: {
        "researcher/*": { model: "anthropic/claude-opus-4.6" },
        "researcher/agent-a": { model: "openai/gpt-5" },
      },
    };
    const agentNames = ["researcher/agent-a", "researcher/agent-b"];

    const result = expandWildcards(profile, agentNames);
    expect(result.agent["researcher/agent-a"].model).toBe("openai/gpt-5");
    expect(result.agent["researcher/agent-b"].model).toBe("anthropic/claude-opus-4.6");
  });

  it("later wildcard overrides earlier wildcard", () => {
    const profile: Profile = {
      agent: {
        "researcher/*": { model: "anthropic/claude-opus-4.6" },
        "researcher/agent-*": { model: "openai/gpt-5", temperature: 0.3 },
      },
    };
    const agentNames = ["researcher/agent-a"];

    const result = expandWildcards(profile, agentNames);
    expect(result.agent["researcher/agent-a"].model).toBe("openai/gpt-5");
    expect(result.agent["researcher/agent-a"].temperature).toBe(0.3);
  });

  it("preserves non-wildcard exact names that don't match any discovered agent", () => {
    const profile: Profile = {
      agent: {
        "researcher/*": { model: "anthropic/claude-opus-4.6" },
        "my-custom-agent": { model: "openai/gpt-5" },
      },
    };
    const agentNames = ["researcher/agent-a"];

    const result = expandWildcards(profile, agentNames);
    expect(result.agent["researcher/agent-a"]).toBeDefined();
    expect(result.agent["my-custom-agent"]).toBeDefined();
    expect(result.agent["my-custom-agent"].model).toBe("openai/gpt-5");
  });

  it("handles profiles with no agent section", () => {
    const profile: Profile = { model: "anthropic/claude-sonnet-4" };
    const result = expandWildcards(profile, ["build", "plan"]);
    expect(Object.keys(result.agent)).toHaveLength(0);
  });

  it("handles empty agent names list", () => {
    const profile: Profile = {
      agent: {
        "researcher/*": { model: "anthropic/claude-opus-4.6" },
      },
    };
    const result = expandWildcards(profile, []);
    expect(result.agent["researcher/*"]).toBeDefined();
  });

  it("supports glob character class patterns", () => {
    const profile: Profile = {
      agent: {
        "reviewer/agent-[cd]": { model: "anthropic/claude-opus-4.6" },
      },
    };
    const agentNames = [
      "reviewer/agent-c",
      "reviewer/agent-d",
      "reviewer/agent-e",
    ];

    const result = expandWildcards(profile, agentNames);
    expect(result.agent["reviewer/agent-c"]).toBeDefined();
    expect(result.agent["reviewer/agent-d"]).toBeDefined();
    expect(result.agent["reviewer/agent-e"]).toBeUndefined();
  });
});
