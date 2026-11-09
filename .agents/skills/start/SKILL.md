---
name: start
description: The manager's one entry point, and its loop — check it's set up, name the box, access, this repository and the side-pane mod, start watching, rebuild the status table from GitHub and its workers' tags, take the first actions, then wait for events and the owner in this same session. Use when the manager's box starts (its launch prompt is /start), in a new session that is to be the manager, after a restart, or whenever the owner says /start.
---

# Start

This session **is** the manager: the owner talks to it, and it runs the
loop (`AGENTS.md`) in the foreground, woken by events (`watch`) and by the
owner's messages alike.

Everything it needs is in GitHub, on its boxes' tags and in
`~/.local/state/manager/` (`docs/state.md`); nothing from an earlier session
is assumed, so the owner can delete every session and start a new one with
`/start`. Safe to run again at any time: every step checks before it acts.

**One manager.** Two sessions both popping events would answer them twice.
If another session on this box is already the manager (a live Monitor on
`discobox-monitor pop --follow`, or the owner says so), say so in one line
and stop unless the owner says this one replaces it.

```sh
eval "$(discobox-access env)"   # GH_TOKEN; leave the DISCOBOX_* environment as it is
```

**Set up first.** `scripts/config check` must pass. If it doesn't
(`"configured": false`, or anything it reports), stop: say in one line what
it reported and that the `setup` skill comes first, and run nothing below.

## 0. Name the box

Discobox lists this box by `~/.discobox/meta.json`'s `name`, and with none, by
whichever session's title it last saw. Make it the manager's, keeping any
fields already there:

```sh
NAME="$(scripts/config get name)" REPOS="$(scripts/config repos | paste -sd, | sed 's/,/, /g')" python3 - <<'PY'
import json, os
p = os.path.expanduser("~/.discobox/meta.json")
try:
    m = json.load(open(p))
except (OSError, ValueError):
    m = {}
m["name"] = os.environ["NAME"]
m.setdefault("description", f"The manager: watches {os.environ['REPOS']}, runs workers, keeps the status table.\nStart with /start.")
m.setdefault("tags", {})["manager"] = ""
text = json.dumps(m, indent=2)
open(p, "w").write(text)
PY
jq . ~/.discobox/meta.json
```

Never give it a `job` tag: that marks a worker (`AGENTS.md`).

## 1. Access

`discobox-access list` must show both:

- a credential in `GH_TOKEN` reaching `api.github.com`, your own use;
- exactly one credential you may delegate reaching `api.github.com`, what you
  bind workers from.

Go by the variable and the hosts, not the name: the owner chooses which
secret to grant, and it may not be called `github` (`workers`, Launch, reads
the delegated one's name).

If either is missing, or `manager.json`'s repositories or a worker skill's
role changed since it was approved, send the generated request from this
repository's root and wait for the owner (`roles/README.md`):

```sh
scripts/request
```

Never write the request by hand: an approved part replaces what you had, so
a repository or role left out is access lost.

Run it in the background and keep its request ID. Say in one line that
you're waiting for the owner to approve it, and go no further until both
parts are approved. A denied part: say what it stops you doing, and stop.

Then check `discobox ls -o json` works (the discobox API). Refused means the
box was started without `--discobox-api`. Ask for it with
`discobox api-access request`, under the Monitor tool, as `setup` §0 does;
never hand the owner a command to run.

Go on with §2–§3 meanwhile; start no worker (§7) until it's approved.

## 2. This repository

`git status` clean (`github` skill, Keeping this repository): workers get
their skills copied from this checkout. Uncommitted changes you didn't make:
ask the owner before committing them.

When `self` is set, `origin` must be it (`git remote get-url origin` is
`https://github.com/` plus `scripts/config get self`). If it isn't, this box
was started from somewhere else (the template, most likely): stop, and run
`setup` §1, which offers to switch to it. Then `HEAD` equals `main` on
GitHub; pull if GitHub is ahead.

When `self` is empty, the manager lives only in this checkout. Don't raise
it again here: `setup` §10 told the owner, and the first round offers it
once more (`AGENTS.md`, Ask first).

## 3. The side pane

The table's side pane is the `manager-table` mod, kept in this skill's
`mods/` folder (the repository is its home: edit it there). A session loads
a mod only from its own mods folder, so each new manager session gets a copy:

1. Load the `plugin-authoring` skill (Skill tool). It names this session's
   mods folder (`~/.claude/dev-mods/<this session's id>/`).
2. Copy each folder in `.agents/skills/start/mods/` into it, unless an
   identical copy is there (`diff -r`), e.g.
   `cp -r .agents/skills/start/mods/manager-table <mods folder>/`.
3. Claude Code asks the owner, once per session, "Turn on the mods Claude
   writes in this session?" Say in one line that the table pane needs
   "Turn them on". After that the session loads it on every resume.

The pane opens by itself only in a terminal at least 144 columns wide;
`/table-pane` opens it at any width. It is the owner's only view of the
table.

## 4. Watching

`discobox-monitor status`. Enable whatever of the `watch` skill's monitors is
missing (the list there is complete: GitHub, workers, submit requests,
disk), and disable instances for repositories no longer in
`scripts/config repos`. A `github-repo`
instance failing with 401 keeps the token it was enabled with: once
`discobox-access list` shows `GH_TOKEN`, `disable` and `enable` it again
(`--update` is not enough), then rebuild from GitHub (§6) for the gap. Then drain what queued
while no session was running: `discobox-monitor pop`, and keep the events for
§7.

## 5. Check each repository's label mapping

For each repository in `scripts/config repos`:

```sh
scripts/status check <repo> | grep MISSING
```

A concept with no label is fine: its status lives in your status comment
(`docs/labels.md`). A `MISSING` label is a typo in `manager.json`: a label
it names that the repository doesn't have. Moving a status to it would ask
GitHub to add a label that doesn't exist, which creates it. **Start nothing
and move no status in that repository** until it's fixed. Its row on the
table is "label mapping wrong": the owner fixes `manager.json` or re-runs
`/setup`. Never create the label.

## 6. Rebuild the table

From GitHub, for each repository:

- open issues: their status (`scripts/status get <repo> <N>`: the mapped
  label, else your status comment, else `new`), their labels for priority
  (`labels.priority`), `flake` (or a `Flaky:` title when it's unmapped) and
  `blocker`, and their milestone;
- open PRs, their checks on the head commit, their mergeable state, and the
  issue each names (`Closes #N` / `Part of #N`);

and from your boxes: `discobox ls -o json`, the ones you created, with their
tags (`repo`, `issue`, `job`, `pr`, the state tag) and, for any that looks
stopped on something, the bottom of its live screen (`workers`).

Match them up by `repo` and `issue`. Then:

- **A box of yours on an issue:** the row follows its state tag.
- **A box of yours showing a question without its tag:** tag it now
  (`workers`, A question without its tag).
- **An issue whose status is `inProgress` and no box of yours holds it:** someone else's
  worker has it (another manager, or the owner). Row "worker not mine", and
  start nothing for it.
- **A community PR** (author not an owner, member or collaborator): never
  merged or run. No issue named: ask the owner whether to back-populate one,
  else comment and close it. An issue named: no row, unless one of our PRs for
  that issue is open (comment naming ours as its replacement, and close it) or
  the issue was rejected (comment why, and close it) (`docs/gates.md`).
- **A maintainer's PR with no issue:** row "needs an issue".
- **A PR from a box of yours that merged, with its issue still open:** close
  the issue (`github` skill) and retire the box.
- **A finished box** (its PR merged or closed, a triage or job `ready` with
  nothing left): archive it
  (`workers`, Retire).

Write the table (`scripts/table`, `table` skill) and its slots line
(`scripts/table slots`); the owner reads it in the side pane.

## 7. First actions

If `scripts/config get workers.paused` is true, start no new boxes except for
the issues in `workers.pausedExcept`. Work already in progress carries on as
usual: rebases, CI fixes, answering its prompts, retiring it. Say on the table
that intake is paused.

Handle the events from §4, then work through the gates (`docs/gates.md`), in
this order, within `workers.max` and `disk.minFreeGiB`:

For a job not in `auto` (`scripts/config auto <job>`), each step below is a
proposal, not an action (`AGENTS.md`, Ask first): collect them, and send
them to the owner in §8's first message as one numbered list.

A job that's off (`scripts/config jobs`) starts nothing: its event is a row for
the owner (`docs/gates.md`).

1. **What's waiting on a worker you hold:** rebase (`rebase`), fix CI
   (`fix-ci`), answer mechanical prompts.
2. **`ready` issues** with a free slot, in Next up order
   (`docs/labels.md`), when `deliver` is on.
3. **New issues** (status `new`) in repositories with no `MISSING` label
   (§5), when `triage` is on: triage, at most `workers.triageMax` at once,
   flakes first, then the focus milestone's, then highest priority, then
   newest (`triage-intake`). With it off, each gets a row for the owner.
   Do it again after every event you handle: an open issue whose status is
   `new` and no triage box gets one now (`triage-intake`; a row alone is
   not triage).
4. **The backlog** (`backlog.mode: wait`), only when a slot is free and
   nothing above is ready to start (`triage-intake`).

After every event, also read the screen of every worker that went idle
without a PR: a question can arrive as an idle "done" event, not only as
"waiting on a question", and a worker can sit on one for hours unseen. A
question there gets its "box needs input" row, or your answer if it's
mechanical.

Update the rows that changed (`scripts/table`).

## 8. Wait, and talk

Start the Monitor tool streaming `discobox-monitor pop --follow` (`watch`
skill). Say one line to the owner: started, what they need to do (an
approval, the discobox API, "Turn them on" for the side pane), and the first
"Your move". Then wait.

From here on, two things wake you, and you handle both in this session:

- **An event** from the stream: handle it by the gates (`docs/gates.md`),
  update the table's rows (`scripts/table`), and end the turn. For a job
  not in `auto`, handling it means proposing what you'd do (`AGENTS.md`,
  Ask first): that's a new move for the owner, so say it. **Say nothing
  in chat** unless the owner has a new move: the table is where status
  lives, and a recap after every event buries what matters.
- **The owner**: answer, and act on what they decide by the gates, as one
  of the events. A yes to proposals: do exactly those, passing
  `--confirmed` to `scripts/launch` for each launch they approved. Where things stand comes from `scripts/table show`, GitHub
  and the boxes, in a few lines, not the whole table. A change to the
  process is an edit to this repository, pushed (`github` skill), then
  followed from your next event on.

The Monitor expires after 30 minutes: re-arm it straight away (`watch`).
"Stop" from the owner means stop the Monitor, nothing else: boxes and
monitor instances are left as they are, and events queue until `/start`
runs again.
