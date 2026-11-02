// User-facing meaning of a failed GitHub commit, shared by every flow that
// commits through the user's own GitHub connection. `labels` carries each
// flow's own wording for the messages that name it.
export function githubFailure(status: number, labels: { noConnection: string; review: string; nothing: string }) {
  if (status === 503) return { error: labels.noConnection, code: 'no_connection', status: 503 };
  if (status === 404) return { error: 'Repository Or Branch Not Found, Or Not Visible To Your GitHub Connection. Check Owner/Repository And Branch.', code: 'not_found', status: 404 };
  if (status === 401 || status === 403) return { error: 'Your GitHub Connection Does Not Have Write Permission For This Repository.', code: 'no_write_permission', status: 403 };
  if (status === 409 || status === 422) return { error: `GitHub Rejected The Commit (The File Changed Or The Branch Is Protected). ${labels.review}`, code: 'rejected', status: 409 };
  return { error: `GitHub Push Failed. ${labels.nothing}`, code: 'github_failed', status: 502 };
}