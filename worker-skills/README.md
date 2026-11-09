# Worker skills

Every worker discobox gets these, installed by the manager with
`discobox run --skills "$PWD/worker-skills"` (`scripts/launch`), copied from
the manager's committed checkout. A worker does one
job and ends in a defined state. The manager reads that state; nobody has to
read the worker's terminal to know where it stands.

## The contract every job keeps

It's the `worker` skill, which every job skill reads first: which repository
and issue the box is on (from its tags), the tags that say where it stands,
asking the owner (`AskUserQuestion`, after tagging `needs-input`), its GitHub
access, and keeping the box up. Nothing in these skills names a repository:
how a repository builds, tests, runs and reviews is in its own `AGENTS.md`
and skills (its `verify-recipes` skill if it has one; `discobox-review` is
in every box).

- **One job per box**, named in its prompt. A box never takes a second issue.
- **Work comes home as a PR** from `discobox/issue-<N>`, pushed where the
  box's `fork` tag says (the acting account's fork, or the repository itself
  when `fork` is its owner), never a push to the base branch.
- **The issue is the brief.** Thin means it should have been triaged first:
  say so and stop rather than guessing.
- **A job skill names its role** in its frontmatter, `metadata.discobox.role`.
  The manager binds that role at launch. When a skill starts making a call
  its role doesn't allow, change the role file (or the skill's role) in the
  same commit.

## Jobs

Each job is opt-in per deployment: the manager launches only the ones its
`manager.json` turns on, and tells a box what it needs through its tags
(`worker`, Where you are).

| Job | Skill | Ends when |
|---|---|---|
| Triage | `triage-issue` | A triage comment proposing labels (from the repository's own) and size, and a verdict; tagged `ready` |
| Design | `propose-design` | The design, written the way the team writes them (`design` tag): in the repository in its own PR, green, or as a comment on the issue; tagged `ready` |
| Deliver | `deliver-issue` | Its PR green, reviewed and verified unless its tags turn those off; tagged `ready` and asleep, woken only when the PR needs it. Retired by the manager on merge |
| Fix CI | `fix-ci` | The fix is a PR, green; tagged `ready` |
| Rebase | `rebase-pr` | The PR rebased keeping both sides, green; tagged `ready` |
| Prototype | `prototype` | The owner has seen the idea working (or not), with `~/prototype.md` listing what was decided and every shortcut; then submitted or dropped |
| Submit | `submit` | An ad-hoc or prototype box's work is an issue with a submit comment, then carried on as `deliver-issue`, parked on a pushed branch, or kept as design only |

`worker`, `commit`, `open-pr` and `verify` are the building blocks those jobs
use.
