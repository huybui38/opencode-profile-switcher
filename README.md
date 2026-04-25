# opencode-profile-switcher

Apply OpenCode profile presets with wildcard agent matching.

This is a workaround for [anomalyco/opencode#18898](https://github.com/anomalyco/opencode/issues/18898) until wildcard agent config is fully available in core.

## What it does

- Expands profile agent wildcards like `researcher/*` to concrete agent names.
- Applies only model-related fields:
  - top-level `model`
  - top-level `small_model`
  - `agent.<name>.model`
- Supports two modes:
  - default: patch local project `opencode.json`
  - `--env`: print a temporary env command for current shell

`use` never writes global OpenCode config.

## Install

```bash
npm install -g opencode-profile-switcher
# or
bun install -g opencode-profile-switcher
```

## Usage

```bash
./cli use <profile_name> [--env] [--dry-run] [--export-only]
./cli list
./cli agents
```

Behavior matrix:

| Command | Result |
|---|---|
| `./cli use <profile>` | Patch local `opencode.json` (default) |
| `./cli use <profile> --env` | Print env command for current shell |
| `./cli use <profile> --env --export-only` | Print only env command (for `eval`) |
| `./cli use <profile> --dry-run` | Preview payload only |

### 1) Local patch mode (default)

```bash
./cli use research-heavy
```

This patches `opencode.json` in the project directory (the directory that contains `opencode.profiles.json`).

- Creates `opencode.json` if it does not exist.
- Does **not** modify global config (`~/.config/opencode/...`).
- Preserves existing non-model keys.

### 2) Temporary shell mode

```bash
./cli use research-heavy --env
```

This prints a shell command to set `OPENCODE_CONFIG_CONTENT` for the current shell session only.

- Shell is auto-detected: `bash`, `zsh`, `sh`, `fish`, `PowerShell`, `cmd`
- It also prints the correct clear command (`unset`, `set -e`, `Remove-Item`, etc.)

Auto-apply in one line:

```bash
eval "$(./cli use research-heavy --env --export-only)"
```

### 3) Dry run

```bash
./cli use research-heavy --dry-run
```

Shows resolved payload and matched agents without applying anything.

### 3.1) Export-only mode (for eval)

```bash
./cli use research-heavy --env --export-only
```

Prints only the shell command with no extra text.
Note: `--export-only` is intended to be used with `--env`.

### 4) List profiles

```bash
./cli list
```

### 5) List discovered agents

```bash
./cli agents
```

## Quick start

Create `opencode.profiles.json`:

```json
{
  "profiles": {
    "research-heavy": {
      "model": "anthropic/claude-opus-4.6",
      "agent": {
        "researcher/*": { "model": "anthropic/claude-opus-4.6" },
        "reviewer/*": { "model": "opencode-go/glm-5" }
      }
    },
    "cost-saver": {
      "model": "anthropic/claude-haiku-4-20250514",
      "small_model": "anthropic/claude-haiku-4-20250514",
      "agent": {
        "build": { "model": "anthropic/claude-haiku-4-20250514" },
        "researcher/*": { "model": "opencode-go/glm-5" }
      }
    }
  }
}
```

Apply temporary override:

```bash
./cli use research-heavy --env
# copy/paste the printed command in same shell
```

Or auto-apply in one line:

```bash
eval "$(./cli use research-heavy --env --export-only)"
```

Apply local patch:

```bash
./cli use research-heavy
```

## Discovery behavior

Agent names are discovered from:

- `agent` keys in nearest `opencode.json` (searching upward from cwd)
- `.md` / `.txt` files in project `.opencode/agents` and `.opencode/agent` (searching upward)
- `.md` / `.txt` files in global `~/.config/opencode/agents` and `~/.config/opencode/agent`

Wildcard expansion uses `minimatch` glob patterns.

## Priority rules

- Exact agent key overrides wildcard match.
- Later wildcard entries override earlier ones.
- In both modes, only model-related fields are applied.
- In patch mode, only local project `opencode.json` is changed.

## Local development

```bash
bun install
bun test
bun run build
```

Run from fixture:

```bash
cd test/fixtures/test-profile
node ../../../dist/cli.js use research-heavy --dry-run
```

## License

MIT
