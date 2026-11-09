---
name: triage-intake
description: How the manager handles incoming work — a new issue, an issue the owner points at, or a request in conversation. Use when an issue's status is `new` (`scripts/status get`), or the owner asks for something to be done.
---

# Intake

Statuses and labels here are concepts (`docs/labels.md`): read and move a
status with `scripts/status get|set`, and read any other concept's label with
`scripts/config label <repo> <concept>`.

## A new issue in a watched repository (status `new`)

0. **Not in a repository whose mapping has a `MISSING` label**
   (`start` §5): start nothing there; its row says the mapping is wrong.
   - **The `triage` job is off** (`scripts/config on triage` fails): no
     triage worker. Add a row for the issue; the owner marks it `ready` (or
     says so in chat). Stop here.
   - **An issue that predates the manager** (opened before
     `backlog.before`, the date `/setup` ran) is backlog, not new.
     `backlog.mode: ignore`: leave it, no row. `wait`: triage it only
     when a slot is free and nothing above it is ready to start
     (`docs/labels.md`, Next up).
   - Only up to `workers.triageMax` triage workers at once: a flake first,
     then the focus milestone's (`focus.milestone`), then highest priority
     (the repository's `labels.priority` order), then newest.
1. Start a triage worker:
   `scripts/launch triage-issue --repo <repo> --issue <N>` (`workers`,
   Launch). **Adding the issue's row is not triaging it:** launch the triage
   worker in the same step, before you handle the next event. If you can't
   (no slot, low disk), the row says why. An issue a worker filed with the
   manager's GitHub account is new work like any other.
2. When it finishes, its verdict is one comment on the issue, whose first
   line you parse:
   `**Triage:** <kind> · size <small|medium|large> · labels <labels>`, the
   labels each in backticks, comma-separated (`labels none` when nothing
   fits), and its **Next:** line (ready to
   deliver, needs a design first, needs a decision, needs info from the
   reporter, a duplicate, already fixed). The box's last screen line says
   the same: `triaged #N: <kind> · <size> · <labels> · <result> — <next>`.
   The worker can't see `manager.json`, so the concept labels are yours to
   add: `kind` `flake` → the repository's `flake` label, if mapped (and at
   least its second-highest priority; unmapped, it's still a flake and ranks
   as one, `blocker=yes` on its row); `kind` `decision` → its `design` label,
   if mapped. The proposed labels are the repository's own; check each exists
   (`scripts/status check`) and drop any status label it proposed.
3. Apply the verdict by `docs/gates.md`: its labels (REST `labels[]`,
   `github` skill), and its status with `scripts/status set`: `ready`,
   `triaged` or `needsDecision`. Needs info from the reporter:
   `triaged`, and its row says what was asked. A duplicate or already fixed → close it
   (`github`, Closing) once the owner agrees. Retire the triage box.

## The owner asks for something in conversation

- If it's a change to a watched repository, **file an issue** (Today /
  Wanted / Done when), then treat it as `ready` (the owner asked; in a
  sample run, `sample` true, leave it `new` so it's triaged, `sample` §7):
  `scripts/status set <repo> <N> ready`, and with the `deliver` job on,
  start the worker (`propose-design` first when the `design` job is on and
  the issue needs a design), by priority when slots are short. With it off,
  it's a row for the owner. Asking for it is the go-ahead: don't wait for a milestone or a
  priority; a missing one is only a question on the table. Don't make the change
  yourself.
- If it's a question about the state of things, answer from GitHub and the
  workers, not from memory.
- If it changes the process, the change goes into this repository. Edit
  AGENTS.md or a skill, then push with the owner's go-ahead (`github`).

## The owner wants to work on something by hand

Start an ad-hoc box for them (`workers`, Ad-hoc boxes), when the `adhoc` job
is on. Nothing is filed yet. When they say they want to **prototype**
something, it's a prototype box (`workers`, Prototype boxes), when the
`prototype` job is on: the box knows to get it working fast, not properly.
A job that's off: say so in one line, and start nothing.
When they say "submit" (in the box, or "submit box X" to you), the box's
`submit` skill files the issue and says what happens to the code; apply its
comment by `docs/gates.md`.

## The owner says an issue is blocking or urgent

Give it the repository's highest priority label (the first in
`labels.priority`, if it has any), and give it the next slot ahead of
everything.
