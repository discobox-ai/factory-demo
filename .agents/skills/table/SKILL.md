---
name: table
description: The manager's single status table for the owner — its columns, ranking and update rules. Use whenever reporting status, after any row changes, or when the owner asks where things stand.
---

# The table

Status and to-do are one table, ranked. It lives in a file the
`manager-table` mod draws as a side pane, with the first "Your move" in a band
above the prompt. **Don't post it in chat**: the pane is the table. Each row
has:

`Item`, `Agent`, `Issue`, `PR`, `Doing`, `Your move` and `Why this rank`.

- **Item** is a plain description, with no numbers in it.
- **Agent** is the worker's box ID, **Issue** and **PR** are bare numbers
  (`api 27` for a repository other than the first in `manager.json`). Each is
  `-` when it doesn't apply.
- **Doing** says what the agent is doing logically: working, waiting for you,
  waiting on CI, done. Never whether its box is running or stopped: workers
  sleep whenever they wait, so asleep is normal.
- **Your move** is `–` unless the owner has something to do:
  - "Approve: <what>" for an action you've proposed and the owner hasn't
    answered (`AGENTS.md`, Ask first), e.g. "Approve: start triage".
  - "Review and merge", only once every check on the PR's head is green,
    the process comment for that head is posted (`github` skill), **and the
    PR is out of draft**. A green draft whose worker is done goes back to its
    worker to mark it ready; the row stays `–` until it is.
    Never "review and merge once green".
  - "Look at it" for a failing PR its worker can't make green.
  - "Answer in the box" for a box tagged `needs-input` (or showing a question
    it didn't tag; tag it first, `workers`).
  - A concrete decision ("Decide A or B on the issue").
  - A design ready for the owner: a file's PR, once green, is "Review and
    merge" (merging it accepts it); an issue comment is "Accept or reject
    the design on the issue".
  - An event for a job that's off (`scripts/config jobs`): what it needs, e.g.
    "Triage it", "Rebase PR N", "Fix CI" (`docs/gates.md`).
- **The merge queue** is the rows at "Review and merge", in rank order.
  Every PR in it is kept rebased: after every merge or close, recheck them
  all and rebase at once any that conflicts, even with every slot full (the
  rebase wakes its own worker). The owner merges in any order, so a rule
  that keeps only the top few rebased leaves the rest sitting conflicted.
- **Why this rank:** written by `scripts/table rank` (`<group> <name>
  (<priority label>)`), from labels and milestones; see Editing it. A
  blocker no label marks (broken CI on the base branch, an issue holding up
  one in the focus milestone, a flake when `flake` maps to no label) gets
  `blocker=yes`. Within a group and
  priority, order by how much a row unblocks (critical path first) with
  `move`.
- **Ad-hoc boxes** get a row too: Item is the owner's topic, Doing "owner
  working" ("owner prototyping" for a prototype box), Your move `–`, until `submit` gives it an issue.
- **Finished boxes** get no row: you archive them yourself (`workers`, Retire).

## Editing it: `scripts/table`

Change only what changed, by row key; never rewrite the file. The key is
the row's issue (`460`, `api 33`), else its PR (`pr 372`), else a name
(`finished`).

```sh
scripts/table set 460 doing="Design PR green" move="Review and merge" pr=463
scripts/table add 461 item="…" agent=sbx_… doing="Working: triage" --before finished
scripts/table rm 411 "pr api 31"
scripts/table move 460 --at 1     # only among rows of the same group and priority
scripts/table rank                # re-read labels and milestones from GitHub, re-sort
scripts/table set 525 blocker=yes # group 1 when no label says so (broken CI)
scripts/table show
```

**The order is computed, not placed.** Every write sorts the rows by group
(1 Blocker, 2 the focus milestone when `focus.milestone` is set, 3 Other,
4 Done; `docs/labels.md`, Next up), then by the repository's priority labels
(`labels.priority`, highest first), keeping your order among equals. `rank`
reads each row's labels, milestone and state from GitHub and writes its
group, priority and `why`; a new row is ranked as it's added. Run
`scripts/table rank` (or `rank KEY`) after any change to a label, a
milestone or `manager.json`'s `focus` or `labels`, and at the start of the
loop. A row whose issue is closed lands in Done: remove it.

Fields: `item agent issue pr doing move why blocker`. `move` is "Your move", `–`
when there's none. Issues, PRs and boxes are links in their rows (boxes as
`discobox:///<id>`); there's no link list under the table. The file is
`~/.local/state/manager/table.json`; the command writes it atomically and
stamps it, and the pane turns "Stale" when it's 15 minutes old.

**Slots:** the top of the pane shows "N/max running" and one line per
running worker. Run `scripts/table slots` (it reads `discobox ls`) on every
worker `box.state` event that starts or stops a box, and on each heartbeat.

## The side pane

The side pane is the owner's only view of the table. It is the
`manager-table` mod, kept in
`.agents/skills/start/mods/manager-table/` and copied into the manager's
session by `/start` (§3). Change it there, then copy it into the session again
(`cp -r`); the session reloads it when the turn ends.

## When it changes

Update the row every time it changes, including a worker resuming after the
owner answered it.

**The row first.** When an event changes what the owner should do (a PR
merged or closed, a PR green, an answer given, a box asking), update its row
before any follow-on work: retiring the box, starting the next worker,
rebasing others. A "Your move" the owner has already done is the table's
worst failure. When several events wait, clear the stale moves for all of
them first, then act on each. In chat, say something only when the owner has
a new move, or when they ask; one line, not the table. When the owner asks
where things stand, answer from `scripts/table show` in a few lines.
