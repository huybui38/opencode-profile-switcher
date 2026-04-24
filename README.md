# opencode-profile-switcher

Switch [OpenCode](https://opencode.ai) profiles with wildcard agent config expansion.

Solves [anomalyco/opencode#18898](https://github.com/anomalyco/opencode/issues/18898) — wildcard support for agent configuration — until it lands in core.

## Why

OpenCode lets you configure agents individually in `opencode.json`, but there's no way to apply settings to a group of agents by pattern. If you have `researcher/agent-a`, `researcher/agent-b`, `reviewer/agent-c`, etc., you must configure each one explicitly.

This tool expands wildcard patterns like `researcher/*` into concrete agent names before launching OpenCode.

## Install

```bash
npm install -g opencode-profile-switcher
# or
bun install -g opencode-profile-switcher
# or use without installing
npx opencode-profile-switcher --help
```

## Quick start

1. Create `opencode.profiles.json` next to your `opencode.json`:

```json
{
  "profiles": {
    "research-heavy": {
      "agent": {
        "researcher/*": { "model": "anthropic/claude-opus-4.6" },
        "reviewer/*": { "model": "opencode-go/glm-5", "temperature": 0.1 }
      }
    },
    "strict-review": {
      "agent": {
        "reviewer/*": {
          "model": "anthropic/claude-opus-4.6",
          "temperature": 0.1,
          "permission": {
            "edit": "deny",
            "bash": "ask"
          }
        }
      }
    }
  }
}
```

2. Switch to a profile:

```bash
opencode-profile switch research-heavy
```

This launches `opencode` with the resolved config injected via the `OPENCODE_CONFIG_CONTENT` environment variable (highest merge priority in OpenCode's config system).

## Sample profiles (multiple models)

Use this as a ready-to-copy `opencode.profiles.json` with different top-level models and per-agent model mappings.

```json
{
  "profiles": {
    "quality-first": {
      "model": "anthropic/claude-opus-4.6",
      "small_model": "anthropic/claude-sonnet-4-20250514",
      "agent": {
        "build": { "model": "anthropic/claude-opus-4.6" },
        "plan": { "model": "anthropic/claude-sonnet-4-20250514" },
        "researcher/*": { "model": "openai/gpt-5" },
        "reviewer/*": { "model": "anthropic/claude-opus-4.6", "temperature": 0.1 }
      }
    },
    "balanced": {
      "model": "anthropic/claude-sonnet-4-20250514",
      "small_model": "anthropic/claude-haiku-4-20250514",
      "agent": {
        "build": { "model": "anthropic/claude-sonnet-4-20250514" },
        "plan": { "model": "anthropic/claude-haiku-4-20250514" },
        "researcher/*": { "model": "openai/gpt-4.1" },
        "reviewer/*": { "model": "openai/gpt-4.1-mini" }
      }
    },
    "cost-saver": {
      "model": "anthropic/claude-haiku-4-20250514",
      "small_model": "anthropic/claude-haiku-4-20250514",
      "agent": {
        "build": { "model": "anthropic/claude-haiku-4-20250514" },
        "plan": { "model": "anthropic/claude-haiku-4-20250514" },
        "researcher/*": { "model": "opencode-go/glm-5" },
        "reviewer/*": { "model": "opencode-go/glm-5" }
      }
    }
  }
}
```

Quick usage:

```bash
opencode-profile switch quality-first
opencode-profile switch balanced
opencode-profile switch cost-saver
```

## Commands

### `switch <profile>`

Switch to a profile and launch OpenCode.

```bash
# Launch with env var injection (default)
opencode-profile switch research-heavy

# Write resolved config to opencode.json on disk instead
opencode-profile switch research-heavy --write

# Preview what will be applied without launching
opencode-profile switch research-heavy --dry-run

# Pass extra args to opencode
opencode-profile switch research-heavy -- run "fix the bug"
```

### `list`

List available profiles from `opencode.profiles.json`.

```bash
opencode-profile list
```

### `agents`

List discovered agent names (from `opencode.json` + `.opencode/agents/` + `~/.config/opencode/agents/`).

```bash
opencode-profile agents
```

### `resolve <profile>`

Show how wildcards expand for a given profile.

```bash
opencode-profile resolve research-heavy
```

## How it works

1. Reads `opencode.profiles.json` for profile definitions
2. Discovers agent names from:
   - `agent` keys in `opencode.json`
   - `.md`/`.txt` files in `.opencode/agents/`
   - `.md`/`.txt` files in `~/.config/opencode/agents/`
3. Expands wildcard patterns using [minimatch](https://github.com/isaacs/minimatch) against discovered names
4. Applies the resolved config:
   - **Default**: Sets `OPENCODE_CONFIG_CONTENT` env var, then spawns `opencode` as a child process. This uses OpenCode's native config merge where inline config has the highest priority.
   - **`--write`**: Deep-merges the resolved profile into `opencode.json` on disk.

## Profile schema

```json
{
  "profiles": {
    "<profile-name>": {
      "model": "<model-id>",
      "small_model": "<model-id>",
      "agent": {
        "<agent-name-or-pattern>": {
          "model": "<model-id>",
          "temperature": 0.3,
          "steps": 10,
          "disable": false,
          "permission": { "edit": "deny", "bash": "ask" }
        }
      }
    }
  }
}
```

### Supported profile fields

| Field | Description |
|---|---|
| `model` | Override the top-level model |
| `small_model` | Override the top-level small model |
| `agent` | Agent configs with wildcard support |

### Wildcard patterns

Patterns use [glob syntax](https://github.com/isaacs/minimatch#features):

| Pattern | Matches |
|---|---|
| `researcher/*` | `researcher/agent-a`, `researcher/agent-b` |
| `*-reviewer` | `code-reviewer`, `security-reviewer` |
| `reviewer/agent-[cd]` | `reviewer/agent-c`, `reviewer/agent-d` |
| `**/reviewer` | Any agent ending in `/reviewer` at any depth |

### Priority rules

- **Exact agent config** takes precedence over wildcard matches
- **Later wildcard entries** override earlier ones (last match wins)
- Profile overrides take precedence over base `opencode.json` values

## Example

Given this `opencode.json`:

```json
{
  "model": "anthropic/claude-sonnet-4",
  "agent": {
    "build": { "mode": "primary" },
    "researcher/agent-a": { "mode": "subagent", "description": "Research A" },
    "researcher/agent-b": { "mode": "subagent", "description": "Research B" },
    "reviewer/agent-c": { "mode": "subagent", "description": "Review C" }
  }
}
```

Running `opencode-profile switch research-heavy` expands to:

```json
{
  "model": "anthropic/claude-opus-4.6",
  "agent": {
    "researcher/agent-a": { "model": "anthropic/claude-opus-4.6" },
    "researcher/agent-b": { "model": "anthropic/claude-opus-4.6" },
    "reviewer/agent-c": { "model": "opencode-go/glm-5" }
  }
}
```

This gets injected as `OPENCODE_CONFIG_CONTENT`, so OpenCode merges it on top of your base config at the highest priority tier.

## Test locally

### Prerequisites

- Bun installed (`bun --version`)
- OpenCode installed and available in PATH (`opencode --version`) for end-to-end launch testing

### 1) Install dependencies

```bash
bun install
```

### 2) Run unit + integration tests

```bash
bun test
```

The repo includes fixture-based integration tests in `test/integration.test.ts` using `test/fixtures/test-profile/`.

### 3) Build the CLI

```bash
bun run build
```

### 4) Run CLI directly from build output

```bash
# list profiles from fixture
node dist/cli.js list

# resolve wildcard expansion
node dist/cli.js resolve research-heavy

# dry-run switch (no opencode launch)
node dist/cli.js switch research-heavy --dry-run
```

### 5) End-to-end launch test (optional)

```bash
# launches opencode with OPENCODE_CONFIG_CONTENT injected
node dist/cli.js switch research-heavy
```

### 6) Test write mode safely

```bash
# writes merged config to opencode.json
node dist/cli.js switch fast-cheap --write
```

Tip: run write-mode tests in a disposable test directory or commit/stash your `opencode.json` first.

## Related

- [Issue #18898](https://github.com/anomalyco/opencode/issues/18898) — Original feature request for wildcard agent config
- [PR #18907](https://github.com/anomalyco/opencode/pull/18907) — Core implementation (pending)
- [OpenCode Plugins](https://opencode.ai/docs/plugins/) — Plugin system (can't intercept agent config resolution, hence this tool)

## License

MIT
