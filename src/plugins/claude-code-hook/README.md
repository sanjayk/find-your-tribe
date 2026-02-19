# fyt-burn

Report Claude Code token usage to [Find Your Tribe](https://findyourtribe.dev) — a social network where clout comes from shipping.

Every Claude Code session you run gets reported as a "burn" — a signal of real work happening. Your tribe sees it. Your reputation grows.

## Installation

```bash
npm install -g fyt-burn
```

Requires Node.js 18 or later.

## Setup (three commands)

```bash
# 1. Authenticate with your Find Your Tribe account
fyt-burn login

# 2. Install the Claude Code hook (writes to ~/.claude/settings.json)
fyt-burn install
```

That's it. Every Claude Code session now reports automatically.

## Command Reference

### `fyt-burn login`

Authenticate with your Find Your Tribe account. Opens a browser to complete OAuth, then stores a token in `~/.fyt-burn/config.json`.

```bash
fyt-burn login
```

### `fyt-burn install`

Install the PostToolUse hook into your Claude Code settings (`~/.claude/settings.json`). The hook runs `fyt-burn report` after every Claude Code tool invocation.

```bash
fyt-burn install
```

Options:
- `--dry-run` — preview the settings change without writing it

### `fyt-burn report`

Manually report a burn event. Normally called automatically by the Claude Code hook, but can be invoked directly for testing.

```bash
fyt-burn report
```

Options:
- `--project <path>` — override the project directory (default: current directory)
- `--dry-run` — print what would be sent without sending

### `fyt-burn log`

Display recent burns reported from this machine.

```bash
fyt-burn log
fyt-burn log --limit 20
```

### `fyt-burn status`

Check hook installation status and authentication state.

```bash
fyt-burn status
```

Example output:
```
Auth:   logged in as @yourhandle
Hook:   installed (PostToolUse)
API:    https://api.findyourtribe.dev
```

## Troubleshooting

### "Not authenticated"

Run `fyt-burn login` to authenticate. Your token is stored at `~/.fyt-burn/config.json`.

### "Hook not installed"

Run `fyt-burn install`. The hook writes a `PostToolUse` entry to `~/.claude/settings.json`. If that file doesn't exist, it will be created.

### "Project not found"

`fyt-burn report` resolves the project by looking for a git remote pointing to GitHub. Ensure you're inside a git repository with a GitHub remote:

```bash
git remote -v
```

If your remote is not GitHub-hosted, the burn is reported without a project association (still counts toward your burn score).

### "Connection refused" / API errors

Check that the API is reachable:

```bash
fyt-burn status
```

If the API URL is wrong, edit `~/.fyt-burn/config.json` and update the `apiUrl` field.

### Uninstalling the hook

Remove the `PostToolUse` entry from `~/.claude/settings.json` manually, or run:

```bash
fyt-burn install --uninstall
```
