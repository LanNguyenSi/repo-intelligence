import { Octokit } from "@octokit/rest";

let _octokit: Octokit | null = null;

export function getOctokit(token?: string): Octokit {
  if (_octokit) return _octokit;
  _octokit = new Octokit({
    auth: token ?? process.env.GITHUB_TOKEN,
    userAgent: "ci-insights/1.0.0",
  });
  return _octokit;
}

/** Reset client (useful for testing or token refresh) */
export function resetOctokit(): void {
  _octokit = null;
}
