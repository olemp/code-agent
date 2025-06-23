
// --- Type Definitions ---

export type AgentEvent =
  | { type: 'issuesOpened', github: GitHubEventIssuesOpened }
  | { type: 'issueCommentCreated', github: GitHubEventIssueCommentCreated }
  | { type: 'pullRequestCommentCreated', github: GitHubEventPullRequestCommentCreated }
  | { type: 'pullRequestReviewCommentCreated', github: GitHubEventPullRequestReviewCommentCreated }
  ;

export type GitHubEvent =
  | GitHubEventIssuesOpened
  | GitHubEventIssueCommentCreated
  | GitHubEventPullRequestCommentCreated
  | GitHubEventPullRequestReviewCommentCreated;

export type GitHubEventIssuesOpened = {
  action: 'opened';
  issue: GitHubIssue;
}

export type GitHubEventIssueCommentCreated = {
  action: 'created';
  issue: GitHubIssue;
  comment: GithubComment;
}

export type GitHubEventPullRequestCommentCreated = {
  action: 'created';
  issue: GitHubPullRequest;
  comment: GithubComment;
}

export type GitHubEventPullRequestReviewCommentCreated = {
  action: 'created';
  pull_request: {
    number: number;
    title?: string;
    body?: string;
  };
  comment: {
    id: number;
    body: string;
    path: string;
    in_reply_to_id?: number;
    position?: number;
    line?: number;
  };
}

export type GithubComment = {
  id: number;
  body: string;
}

export type GitHubIssue = {
  number: number;
  title: string;
  body: string;
  pull_request: null;
}

export type GitHubPullRequest = {
  number: number;
  title: string;
  body: string;
  pull_request: {
    url: string;
  };
}

export type GithubContentsData = {
  content: { number: number; title: string; body: string; login: string };
  comments: { body: string; login: string }[];
};

export type RepoContext = { owner: string; repo: string };

export interface ProcessedEvent {
  type: "claude" | "codex";
  agentEvent: AgentEvent;
  userPrompt: string;
}


