---
description: Merge PR
parameters:
  - name: pr_number
    description: The GitHub PR number to merge
    required: true
---

# Merge GitHub PR #{pr_number}

1. Merge PR #{pr_number}. A

2. Add a comment to the connected issue (if any). If you added any tasks to GitHub from TODOs (/check-todos workflow) during this workflow, mention it in the issue comment.

3. After merging the pull request, ensure your local `main` branch is up-to-date. Run the following commands in your terminal:

```sh
git checkout main
git fetch --prune
git pull
```
