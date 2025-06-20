---
description: Fix a GitHub issue with a complete workflow
---

# Solving GitHub Issue #{issue_number}

Help me solve issue #{issue_number}. Follow these steps:

1. Get details using the `gh issue` command
2. Create a new branch for the code changes with a descriptive name related to the issue
3. Implement the necessary changes to resolve the issue
4. Commit the changes using gitmoji convention (with [ai] tag and appropriate emoji at the end)
5. Push the branch to the remote repository
6. Create a draft PR with:
   - A descriptive title that includes the appropriate gitmoji
   - A properly formatted description with actual newlines (not \n escape sequences)
   - Include "Closes #issue_number" in the description
   - Add labels "vibe" and "windsurf"
   - Use the template `.github/pull_request_template`
7. Add details about the pull request you're working on in file `pull_request_info.md` in the `.windsurf/logs` directory. Overwrite the file.

When writing PR descriptions, always use proper line breaks with actual newlines instead of \n escape sequences, and format using markdown with clear sections and lists as needed.
