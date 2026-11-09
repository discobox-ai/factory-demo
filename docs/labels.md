# Labels and status

The manager needs a handful of **concepts**: where an issue is (its status),
how important it is, and a few kinds that route it. It **adopts the labels a
repository already has** for them and never creates, renames or deletes one.
`manager.json` says which label means each concept, per repository; a
concept no label fits is `null`.

Every status read or change goes through `scripts/status`:

- **A concept with a label:** the status is that label on the issue.
- **A concept without one:** the status is kept in the **manager's status
  comment**, one comment on the issue by `github.login`, starting
  `<!-- manager:status -->`, created the first time it's needed and edited in
  place after. GitHub still holds it, so a new session rebuilds it.
- A mapped status label on the issue wins over the comment: the owner can
  move an issue by labelling it by hand.

`scripts/config label <repo> <concept>` reads a concept's label (empty: none);
`scripts/status check <repo>` lists the mapping and flags a mapped label the
repository doesn't have (a typo in `manager.json`).

## Status: where an issue is

| Concept | Means | Set by |
|---|---|---|
| `new` | Not triaged yet. Unmapped: no status at all means new | whoever files it, or nobody |
| `triaged` | Scoped, waiting for priority or a slot | the manager, from a triage verdict |
| `needsDecision` | The owner has to decide something before work starts; the issue says what | the manager |
| `needsInput` | Its worker is waiting on the owner in the box (a question on its screen) | the manager, from the box's `needs-input` tag |
| `ready` | Go: the next free worker takes it | the owner, or the manager per `gates.md` |
| `inProgress` | A worker is on it (its box is tagged `issue=N`) | the manager (`scripts/launch`) |
| `inReview` | Its PR is green, waiting for the owner | the manager |
| `blocked` | Waiting on something, named in a comment | the manager or a worker |

## Routing

| Concept | Means |
|---|---|
| `priority` | The repository's priority labels, **highest first**. Empty: everything is unprioritised and newest goes first. |
| `autoReadyMax` | A triage verdict at this priority or lower goes straight to `ready`; higher goes to the owner as `needsDecision`. `null`: every verdict goes to the owner. |
| `flake` | A test that fails intermittently: skips triage, goes to `ready`, ranks as a blocker. `null`: the manager still recognises a flake from its triage verdict or a `Flaky:` title, and ranks it so, with no label. |
| `design` | The issue is a design question itself. `null`: none. |
| `blocker` | Labels that rank an issue as a blocker, ahead of everything. |

Every other label is the repository's own. A triage worker reads the
repository's labels and proposes those that fit; the manager applies them.

## Next up

What starts next, and how the table ranks, in groups, each by `priority`
within it:

1. **Blockers:** a flake, a `blocker` label, anything that breaks the base
   branch's CI, anything blocking an issue in the focus milestone.
2. **The focus milestone** (`focus.milestone`), when set.
3. **Everything else that's ready.**

The backlog (`backlog.mode`) waits: open issues opened before
`backlog.before` with no status are triaged only when a slot is free with
nothing ready to start. A newly filed issue is triaged when it arrives.

## Initiatives

A multi-issue effort is a tracking issue, not a milestone: one issue can span
repositories, and its comments carry the direction the owner sets. Its body
lists the effort's issues as a task list and links its designs. Each issue in
it says `Part of <repo>#<N>`.

## Linkage

- A box's tags are defined in the `worker` worker skill: `repo`, `issue`,
  `job` (`scripts/config jobs`), `base`, `fork`, and for some jobs `review`,
  `verify`, `design`, `design-name`, `design-path`, set by the manager at
  launch; `pr=<P>` and one state tag (`needs-input`, `blocked`, `ready`) set
  by the box. Retired boxes are archived (`discobox rm`), not tagged.
- An implementation PR says `Closes #N`; a design PR says `Part of #N`.
- Issues are written as `## Today` / `## Wanted` / `## Done when`, citing files
  and designs, so a worker can start from the issue alone.
