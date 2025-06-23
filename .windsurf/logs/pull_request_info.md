# Pull Request Information

- **PR Number**: 9
- **Title**: ✨ optimize file capture to reduce token usage
- **Branch**: feat/optimize-file-capture
- **Issue**: Closes #8
- **URL**: https://github.com/olemp/code-agent/pull/9
- **Status**: Draft

## Implementation Details

- Created `IFileCaptureOptions` interface for configurable file capture
- Implemented file size limits with a default of 1MB
- Added a comprehensive list of excluded file types for binaries and large files
- Added support for file prioritization patterns
- Updated call sites to use the new optimized file capture API

