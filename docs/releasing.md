# Releasing

## One-time setup

Create a fine-grained GitHub personal access token with **Contents: Read and write** access to `schinwald/homebrew-agent-console`. Add it to the `schinwald/agent-console` repository as the `HOMEBREW_TAP_TOKEN` Actions secret.

The release workflow uses this token to update both Homebrew formula release URLs and SHA-256 checksums after it publishes the GitHub Release.

## Release steps

1. Run tests and commit changes.
2. Push `main`, create and push an annotated version tag:

```bash
git tag -a vX.Y.Z -m 'Release vX.Y.Z'
git push origin vX.Y.Z
```

3. Wait for GitHub Actions to publish universal frontend/backend archives and automatically update `schinwald/homebrew-agent-console`.
4. Deploy locally:

```bash
brew update
brew upgrade agent-console
brew services restart agent-console-backend
```

5. Trigger the TPM sync hook and query the backend socket. Verify the agent response contains `tmuxSession`, `tmuxWindow`, and `tmuxPane` matching its pane.
