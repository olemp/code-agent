# Pull Request Information

- **PR Number**: 7
- **Title**: ✨ feat: add token usage tracking to codex execution
- **Branch**: feat/add-token-usage-tracking
- **Issue**: Closes #6
- **URL**: https://github.com/olemp/code-agent/pull/7
- **Status**: Draft

## Implementation Details

This PR implements token usage tracking for the Codex CLI by:

1. Creating a new `ICodexResult` interface in `src/client/types.ts` to store token usage metrics
2. Modifying the `runCodex` function in `src/client/codex.ts` to extract token usage data
3. Updating `runAction.ts` to handle the new return type structure

The token usage data is extracted from the JSON response if available and includes total tokens, prompt tokens, and completion tokens.
