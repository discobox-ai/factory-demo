---
name: watch
description: How the manager watches GitHub and its workers and gets woken — discobox-monitor instances and one waiting pop. Use at the start of every session, and when an event arrives or watching seems to have stopped.
---

# Watch

The manager is woken by **events**, never by polling in its own turns.

## Monitors

Enable these once per box (instances survive restarts; `discobox-monitor
status` lists them). Two `github-repo` instances per repository in
`manager.json` (`scripts/config repos`), because `author` and `branch` narrow
everything an instance sees: with them set it reports only matching PRs and
that branch's runs, not issues or anyone else's PRs.

```sh
eval "$(discobox-access env)"   # github-repo reads GitHub with GH_TOKEN
LOGIN=$(scripts/config get github.login)
for r in $(scripts/config repos); do
  n=${r//\//-}
  # Every issue and PR: new issues to triage, PRs without an issue, comments, merges.
  discobox-monitor enable github-repo --name gh-$n      -o repo=$r -o watch=issues,prs
  # Workers' PRs (by author: from a fork, a branch name doesn't match) with
  # their checks and conflicts, and the base branch's CI.
  discobox-monitor enable github-repo --name gh-$n-work -o repo=$r -o author=$LOGIN \
    -o branch=$(scripts/config repo $r base)
done
# Workers: state, primary terminal busy/idle, secret requests.
discobox-monitor enable discobox-box --name workers -o created-by=me
# Disk.
discobox-monitor enable command --name disk -o cmd='df -BG --output=avail / | tail -1' -o every=5m
```

A worker's PR shows up in both `gh-<repo>` and `gh-<repo>-work`; act on an
event once (same `url` and `kind`). Add or drop a pair when `manager.json`'s
repositories change. `discobox-monitor test <monitor> -o … --since 12h`
replays a past window without enabling anything, to check an option.

When `github.actor` is `owner`, `author` is the owner's own login, so the
`-work` instance also reports the owner's own PRs: act on those only as the
gates say for a maintainer's PR.

Then stream the queue with **one** Monitor tool, not a background
`pop --wait`: each event arrives as it lands, with no gap between one pop
returning and the next starting.

```
Monitor(
  command: "eval \"$(discobox-access env)\"; discobox-monitor pop --follow",
  description: "discobox monitor events (manager: GitHub, workers, disk)",
  timeout_ms: 1800000,
)
```

- Handle each event by `docs/gates.md` as it arrives. `discobox-monitor read
  ID` gives its body.
- A `pr.comment` or `issue.comment` from a worker whose title or body starts
  `**Issue to file**` is a worker handing you an issue: file it (`github`,
  Filing and editing issues).
- An `issue.comment` from the owner on an issue whose design is waiting on
  them (`design.artifact: issue`) may accept or reject it (`docs/gates.md`).
  Read it, and act only on the owner's own words.
- Only one pop at a time: never run a bare `discobox-monitor pop` while the
  stream is up, or it takes events away from the stream.
- The Monitor tool expires after 30 minutes. Re-arm it with the same
  command straight away; events that came in meanwhile are still queued.
  Each expiry is the heartbeat: check disk, and say nothing unless something
  changed.
  Also on each heartbeat: any worker PR that is green but still a draft, with
  no push for 20 minutes, means its worker slept and wasn't woken (a
  `discobox-power sleep --wake-in` timer can fail to fire).
  Start that worker and type one line: its PR is green, finish it (`open-pr`)
  and mark it ready.
- While a box waiting on the owner is due to be paused (`workers`, Power),
  check it when it's due rather than waiting for an event.

## Start of every session

`start` (§4) enables the monitors and starts the one Monitor stream, in
the manager's session, the one the owner talks to. No other session pops
the queue.
