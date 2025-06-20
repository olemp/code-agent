---
description: Improved workflow to find TODOs, create GitHub issues, and commit changes.
---

# Improved Workflow: Processing TODOs into GitHub Issues

This workflow outlines a more structured approach to finding `TODO` comments in your codebase, creating corresponding GitHub issues, and then making a commit that references these new issues.

## 1. Workflow Steps

### Step 1.1: Identify TODOs in the Codebase

Look for comments in the code with `TODO:` prefix. Don't look in files that are git ignored. Also check for labels in the TODOs in [].

**Example:**

```typescript
// TODO: Refactor this into a new file [refactor,enhancement]
```

`refactor` and `enhancement` labels should be added to the issue in Step 1.2.

### Step 1.2: Create GitHub Issues

Create issues in GitHub using the `gh` CLI. Add a good title, description and potentially labels based on the TODOs found.

### Step 1.2: Update Code

- Once an issue is created for a TODO, update the TODO comment in the code to reference the new issue number (or even better a URL to the issue on GitHub).
  - Before: `// TODO: Refactor data fetching logic`
  - After: `// TODO: https://github.com/computas/maildig/issues/122
- The URL to GitHub issues can be found in package.json under `repository.issues`
- This creates a clear link between the code and the tracked issue.

### Step 1.5: Create a Commit

Add all changes done to and add a commit describing the todos that were found and created. Mention their issue number.

## 2. Best Practices

- **Be Specific in TODOs:** Write clear and actionable TODO comments. "TODO: Fix this" is less helpful than "TODO: Refactor user authentication to use OAuth2 due to security concerns with current session management."
- **Regularly Review TODOs:** Don't let TODOs accumulate indefinitely. This workflow helps, but proactive review is key.
- **Assign Issues:** Once issues are created, assign them to team members and prioritize them.
- **Use Consistent Formatting:** Standardize how TODOs are written to make parsing easier.

This improved workflow provides a more robust and potentially automatable way to manage TODOs in your codebase.
