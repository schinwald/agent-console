# Distribution roadmap

This roadmap publishes Agent Console through Homebrew, runs its backend as an explicit Homebrew service, and provides tmux integration through a TPM-compatible plugin.

## User setup target

```bash
brew tap OWNER/agent-console
brew install agent-console
brew services start agent-console-backend
```

Then configure TPM with `OWNER/tmux-agent-console` and run `agent-console` to open the frontend.

`brew services start agent-console-backend` is intentionally explicit. Formula installation must not silently register or start a background process.

## Repository boundaries

| Repository | Responsibility |
| --- | --- |
| `agent-console` | Application source, compiled release artifacts, release workflow, install documentation. |
| `homebrew-agent-console` | Homebrew tap and formulas. |
| `tmux-agent-console` | TPM entrypoint and tmux event-hook integration. |

## Release artifact contract

A version tag, such as `v0.1.0`, produces four GitHub Release archives from `agent-console`.

| Archive | Build target | Required contents |
| --- | --- | --- |
| `agent-console-darwin-arm64.tar.gz` | `bun-darwin-arm64` | `agent-console` |
| `agent-console-darwin-x86_64.tar.gz` | `bun-darwin-x64` | `agent-console` |
| `agent-console-backend-darwin-arm64.tar.gz` | `bun-darwin-arm64` | `libexec/agent-console-backend`, `libexec/agent-console-backend-tmux-hook` |
| `agent-console-backend-darwin-x86_64.tar.gz` | `bun-darwin-x64` | `libexec/agent-console-backend`, `libexec/agent-console-backend-tmux-hook` |

Each archive has a published SHA-256 checksum. Homebrew formulas download these archives and use the matching checksum.

The TPM plugin is source-only. It is distributed by its own Git repository, not inside the Homebrew release archives.

## Tickets

### AC-01 — Release artifact contract

- **Repository:** `agent-console`
- **Scope:** Maintain the artifact names, build-target mapping, and archive layouts above.
- **Done when:** Formula install paths match every archive layout.
- **Dependencies:** None.

### AC-02 — Cross-platform release build

- **Repository:** `agent-console`
- **Scope:** Add tag-triggered automation that compiles frontend, backend, and backend tmux-hook executables for `bun-darwin-arm64` and `bun-darwin-x64`; package, checksum, and upload the four archives.
- **Done when:** A version tag produces a GitHub Release containing all four archives and their SHA-256 values.
- **Dependencies:** AC-01.

### AC-03 — Backend Homebrew service

- **Repository:** `homebrew-agent-console`
- **Scope:** Finalize `agent-console-backend.rb` with release URLs/checksums, `service do` configuration, backend and tmux-hook installation, and formula tests.
- **Done when:** `brew services start agent-console-backend` creates a persistent user launchd service and the backend socket becomes ready.
- **Dependencies:** AC-02 and a published release.

### AC-04 — Frontend Homebrew formula

- **Repository:** `homebrew-agent-console`
- **Scope:** Finalize `agent-console.rb` with release URLs/checksums and a dependency on `agent-console-backend`.
- **Done when:** `brew install agent-console` installs both frontend and backend formulas.
- **Dependencies:** AC-02 and a published release.

### AC-05 — TPM plugin

- **Repository:** `tmux-agent-console`
- **Scope:** Create a TPM-compatible entrypoint and event-hook script. Resolve the local Homebrew backend hook, register tmux focus/context hooks, and perform initial synchronization.
- **Done when:** TPM installation causes tmux window/client changes to update Agent Console's active agent.
- **Dependencies:** None for plugin development; AC-03 for installed-system validation.

### AC-06 — Installation documentation

- **Repository:** `agent-console`, `homebrew-agent-console`, and `tmux-agent-console`
- **Scope:** Document the Homebrew install, explicit backend service start, TPM configuration, and validation commands.
- **Done when:** A new user can complete setup without source checkout instructions.
- **Dependencies:** AC-03 through AC-05.

### AC-07 — End-to-end release smoke test

- **Repository:** Integration across all three repositories.
- **Scope:** On a clean machine or test user, install through Homebrew, start the backend service, install TPM plugin, and verify frontend-to-tmux active-agent synchronization.
- **Done when:** Installation, service readiness, plugin initial sync, tmux context changes, and frontend navigation all work.
- **Dependencies:** AC-03 through AC-06.

## Parallel execution

After AC-01:

- **Lane A:** AC-02 in an `agent-console` worktree.
- **Lane B:** AC-05 in a `tmux-agent-console` worktree.
- **Lane C:** Prepare non-release-specific formula changes for AC-03 and AC-04 in separate `homebrew-agent-console` worktrees; add final URLs/checksums only after AC-02 publishes a release.

AC-06 and AC-07 remain final integration work.

## Worktree prerequisite

Use one Git worktree per writing agent. The current local directories are not Git repositories, so locate their Git clones or initialize/push repositories before parallel implementation begins.
