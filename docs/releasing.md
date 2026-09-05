# Releasing

1. Run backend tests and commit changes.
2. Push `main`, create and push an annotated version tag:

```bash
git tag -a vX.Y.Z -m 'Release vX.Y.Z'
git push origin vX.Y.Z
```

3. Wait for GitHub Actions to publish universal frontend/backend archives. Record the backend archive SHA-256.
4. In `homebrew-agent-console/Formula/agent-console-backend.rb`, update the release URL and SHA-256; commit and push the tap.
5. Deploy locally:

```bash
brew update
brew upgrade agent-console-backend
brew services restart agent-console-backend
```

6. Trigger the TPM sync hook and query the backend socket. Verify the agent response contains `tmuxSession`, `tmuxWindow`, and `tmuxPane` matching its pane.
