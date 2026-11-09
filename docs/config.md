# manager.json

The only per-deployment settings. `/setup` writes it; the owner changes it by
asking the manager. Read it with `scripts/config` (never parse it by hand: a
repository's `labels` override the top-level ones, and `scripts/config`
merges them). `scripts/config check` refuses an unconfigured or inconsistent
file.

| Field | Means |
|---|---|
| `configured` | `false` until `/setup` finishes. `/start` refuses while it's false. |
| `name` | The box's name in `discobox ls`. |
| `owner.github`, `owner.email` | The person the manager works for. Only their own words authorize a push, a credential or a change of process. |
| `self` | `OWNER/REPO` of the manager's own repository, where every change is pushed (`github-push`). Empty until the owner forks the template or makes a repository and names it (`setup` §11); until then the manager lives in this box's checkout, committed locally. |
| `upstream` | `OWNER/REPO` of the template, shipped with it: what the owner forks to keep the manager. `/setup` compares it with the box's `origin` to tell a template clone from the owner's own fork. Nothing is pulled from it. |
| `github.actor` | `bot`: the manager and workers act as a separate account. `owner`: as the owner's own account. |
| `github.login` | That account's login. Workers that push to a fork push to this account's fork. |
| `repos[]` | The repositories watched. Each: `name` (`OWNER/REPO`), `base` (what workers branch from and PRs target), `access` (the actor's permission, from GitHub), `push` (`fork`: to `github.login`'s fork; `branch`: to a branch in the repository itself, which needs Write), and optionally `labels` (overrides). |
| `jobs` | Which jobs the manager runs, each `true` or `false` (`scripts/config jobs`): `triage`, `design`, `deliver`, `fix-ci`, `rebase`, `adhoc`, `prototype`. A job is whatever a worker skill declares in its frontmatter (`metadata.discobox.job`, beside its `discobox.role`), so a new worker skill adds a job by declaring one. A job that's off is never launched, and its role isn't delegated; what happens instead is in `docs/gates.md`. |
| `auto` | The jobs the manager acts for without asking first. Empty (the default): every action that changes something is proposed to the owner first (`AGENTS.md`, Ask first). The owner grows it ("do triage on your own"). |
| `sample` | `true` in a sample run (`sample` skill): written whole from `sample/manager.json` by `scripts/sample config`, and put back to what it was by `scripts/sample reset` when the owner sets up for real. `false` otherwise. |
| `onboarding` | `true` until the first worker has finished and the manager has asked the owner how it went and what next. |
| `deliver.review`, `deliver.verify` | Whether a delivery worker reviews its change to sign-off (`discobox-review`) and exercises it at runtime (`verify`). Reach the worker as box tags. |
| `design.artifact` | When `jobs.design` is on: `file` (a document in the repository, accepted when the owner merges its PR) or `issue` (a comment on the issue, accepted when the owner says so). |
| `design.name`, `design.path` | What the team calls a design (ADR, RFC, design doc) and, for `file`, the directory it lives in. |
| `labels` | The existing label each concept maps to, or `null` (`docs/labels.md`). Top-level for every repository; a repository's own `labels` override it, `status` key by key. |
| `backlog.mode` | Open issues with no status opened before `backlog.before`: `wait` (triaged only when a slot is free and nothing is ready) or `ignore`. |
| `backlog.before` | The date (`YYYY-MM-DD`) `/setup` ran. |
| `focus.milestone` | Optional. Issues in a milestone of this name rank right after blockers. |
| `workers.harness` | The harness every new worker runs (`discobox run -H`). |
| `workers.max`, `workers.triageMax` | Workers running at once, and of those, triage workers. |
| `workers.pauseAfter` | A worker waiting on the owner whose screen has been still this long is stopped. |
| `workers.paused`, `workers.pausedExcept` | Intake pause: start no new triage or delivery boxes, except `OWNER/REPO#N` listed. |
| `disk.minFreeGiB` | Below this, start no workers and have idle ones free build caches. |

## Limits

- **A request holds at most 32 policies** (`scripts/request` checks): one
  `github-manager` per repository and one `github-push` for the manager's own
  repository once it has one, and one per role of a job that's on, per repository, for its workers.
  With triage and delivery both on, that's about ten repositories.
- Changing `repos`, a repository's `push`, or turning a job on or off means a
  new access request (`scripts/request`), in the same change.
