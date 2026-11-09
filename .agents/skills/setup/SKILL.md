---
name: setup
description: Set this manager up for its owner, once, before the first /start — make sure the box can reach the discobox API, ask who it works for and as which GitHub account, which repositories it runs, which of its jobs the owner wants it to manage, how designs are recorded, inspect each repository's labels and adopt them, then write manager.json, ask for the manager's access and hand over to /start. Use when manager.json says "configured": false, the owner types /setup, or the owner wants to add a repository or change which jobs the manager runs.
---

# Setup

This repository is a fresh fork of the manager starter template. Only a few
things are fixed: an owner who merges, a manager that never writes product
code, one worker box per job, and status kept in GitHub and on box tags.
**Everything else is the owner's choice, and you ask about it**: the
repositories, the GitHub account, which parts of the process the manager
runs at all, how designs are written down, and what the labels are. Write
the answers down (`docs/config.md`).

**Adapt; don't impose.** The repositories already have a way of working:
labels, a design process (or none), conventions in their `AGENTS.md`,
`CONTRIBUTING.md` and docs. Read it and fit into it. **Never create, rename
or delete a label.** A status with no label to map to is kept in the
manager's status comment instead (`scripts/status`).

**Ask, don't assume.** Everything below that says *ask* is an
`AskUserQuestion`, with options built from what you read in the
repositories and your recommendation first. Everything that says *read* you
find out yourself. Never invent a repository, label, account or convention.

**Re-running it** (a new repository, a job turned on or off) starts from the
current `manager.json` and asks only about what changes. §9–§10 always run
whole.

## 0. The discobox API

The manager creates, tags and steers its workers through the discobox API,
which a box has only when the owner gives it:

```sh
discobox ls -o json >/dev/null && echo "discobox API: yes"
jq -r .sandboxId /etc/discobox/sandbox.json
```

Refused means this box was started without `--discobox-api`. A box can't
grant itself that, and `discobox-access` can't ask for it, so ask the owner
directly, giving them the exact command with this box's ID, to run on their
own machine:

```
discobox admin box update <this box's sandboxId> --discobox-api
```

Then wait for it: watch with the Monitor tool until the API answers, rather
than asking the owner to tell you.

```
Monitor(command: "until discobox ls -o json >/dev/null 2>&1; do sleep 10; done; echo api-ready",
        description: "waiting for the owner to give this box the discobox API", timeout_ms: 1800000)
```

Go on to §1 meanwhile; nothing before §10 needs the API.

## 1. Where you are

```sh
jq '{configured, self, upstream}' manager.json
git remote get-url origin; git status --short
discobox-access list
```

`origin` is the GitHub repository this box was started from. `upstream` is
the template's own name (shipped in `manager.json`; nothing is ever pulled
from it). `self` is the manager's own repository, empty until set up:

- **`self` is empty and `origin` is `upstream`:** the first run, started
  straight from the template, the usual way. §3 gives the manager a
  repository of its own.
- **`self` is empty and `origin` is something else:** the first run, started
  from the owner's own fork or copy. Confirm with the owner that `origin` is
  to be the manager's repository; then it's `self`, and §3 creates nothing.
- **`self` is set and `origin` is it:** a re-run. Go on.
- **`self` is set and `origin` is something else** (a new box started from
  the template again, say): the manager's real settings are in `self`. Ask
  the owner whether to switch this checkout to it (§3, "Switching"), and do
  nothing else until it's settled.

## 2. Who

Read what you can: `git config user.name`, `user.email`, and
`/etc/discobox/sandbox.json`'s `user` and `git`.

Ask:

1. **The owner**: confirm their GitHub login and email.
2. **Which account the manager and its workers act as on GitHub:**
   - **A bot account** (recommended): a separate GitHub user the owner
     controls, added to each repository with the least access that works
     (Triage is enough; workers then push to the bot's forks). Its comments
     and PRs are visibly the manager's, and its token can't reach the owner's
     other repositories.
   - **The owner's own account**: no setup, but every comment and PR is in
     their name. The roles still narrow every route, and none can merge.

   Record `github.actor` (`bot`/`owner`) and `github.login`.

## 3. The manager's own repository

The manager keeps its settings and skills in a repository of its own, and
commits and pushes every change to it (`github` skill, Pushing to this
repository): `manager.json` written here, process changes later. Workers get
their skills from this checkout, so it must be pushed before any of them
start. **Started from a fork or copy (§1):** it already exists; `self` is
`origin`, and only pushing to it is needed (§4, with `CREATE` empty). Skip
the rest of this step.

Ask where it should live, as `OWNER/NAME` (default: the owner's account or
org, named after the template), and how:

- **A new private repository** (recommended): created empty, and this
  checkout pushed to it. Private, because `manager.json` names the
  repositories it manages and how. No link back to the template.
- **A fork of the template**: keeps GitHub's link to the template. A fork of
  a public repository is public.
- **A repository the owner already made** (empty): just pushed to.

When `github.actor` is `bot`, the bot pushes it from now on: create it under
the bot's account, or ask the owner to add the bot to it with Write.

Creating it and pushing to it need GitHub access; §4 asks for that together
with reading the repositories, in one request. Once it's granted:

```sh
eval "$(discobox-access env)"
SELF=OWNER/NAME UPSTREAM=$(scripts/config get upstream)
# One of, as the owner chose:
gh api -X POST user/repos -f name=NAME -F private=true                  # new, in the owner's account
gh api -X POST orgs/OWNER/repos -f name=NAME -F private=true            # new, in an org
gh api -X POST repos/$UPSTREAM/forks -f organization=OWNER -f name=NAME # a fork (drop organization for the owner's account)
# Then point origin at it and push:
git remote rename origin upstream
git remote add origin https://github.com/$SELF
H='!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f'
git -c credential.helper= -c credential.helper="$H" push -u origin HEAD:main
```

A fork takes a few seconds to appear: retry the push for a minute before
calling it failed. Then write `self` (and `upstream`) into `manager.json`.
From here on `origin` is the manager's own repository, and every later push
goes there.

**Switching** (§1, `self` set but `origin` isn't it): with the owner's yes,
point `origin` at `self`, fetch its `main`, and check it out
(`git remote rename origin upstream; git remote add origin
https://github.com/$SELF; git fetch origin main; git checkout -B main
origin/main`). Local changes: ask before discarding them.

## 4. Which repositories

Ask for the repositories, as `OWNER/REPO`. Leave the manager's own (`self`)
out unless the owner wants its changes to go through issues and PRs too; the
manager pushes it directly.

Then ask for what setup needs, in one request: read the repositories, and
create and push the manager's own (§3). `CREATE` is `user`, `org:OWNER`,
`fork` or empty (an existing repository):

```sh
REPOS="acme/web acme/api" SELF=acme/manager CREATE=user scripts/request --setup
```

Run it in the background, say in one line that it's waiting for the owner's
approval, and go on once it's granted (`eval "$(discobox-access env)"`): do
§3's push first, then read the repositories.

For each repository, read:

```sh
gh api repos/$R --jq '{default_branch, private, permissions, has_issues}'
gh api "repos/$R/labels?per_page=100" --paginate --jq '.[] | [.name, .description // ""] | @tsv'
gh api "repos/$R/issues?state=all&per_page=100" --jq \
  '[.[] | select(.pull_request | not) | .labels[].name] | group_by(.) | map({(.[0]): length}) | add'
gh api "repos/$R/issues?state=open&per_page=100" --paginate --jq '[.[] | select(.pull_request | not)] | length'
gh api repos/$R/milestones --jq '.[].title'
gh api repos/$R/contents --jq '.[].name'          # AGENTS.md, CONTRIBUTING.md, docs/ …
```

and the repository's own process documents (`AGENTS.md`, `CLAUDE.md`,
`CONTRIBUTING.md`, any `docs/adr`, `rfcs`, `design` or similar directory and
its README, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/`).
They tell you how this team works; the manager fits into it.

`permissions` is the token's, which is the actor's only when the actor is
the owner. For a bot, ask the owner what role it has (or will have) on each
repository; `gh api repos/$R/collaborators/$LOGIN/permission` answers it
once the bot is a collaborator.

Per repository, settle (ask where it isn't obvious):

- `base`: the default branch, unless the owner's PRs go elsewhere.
- `access`: the actor's permission.
- `push`: `branch` if the actor has Write and the owner is happy with
  branches in the repository; else `fork` (the first worker creates the fork).

## 5. Which jobs the manager runs

Each job is a kind of worker box (`scripts/config jobs`). First ask how to
begin:

- **Start small** (recommended, and the default on a first run): only
  `triage`, one worker at a time (`workers.max` and `workers.triageMax` 1),
  and the manager asks before every step. The owner watches one round of
  the process end to end; afterwards the manager asks how it went and
  offers the next job (`AGENTS.md`, Ask first). Skip to §7.
- **Choose the jobs now**: ask about **each one separately** (one
  `AskUserQuestion` with up to four questions at a time), saying in a
  sentence what turning it on means and what happens with it off. None is
  on by default.

Either way, `auto` starts empty: the manager proposes every action until the
owner tells it to act alone for a job. Re-running setup to add a job leaves
`auto` as it is, so a new job starts by asking.

| Job (`jobs.*`) | On: the manager… | Off: |
|---|---|---|
| `triage` | starts a worker on each new issue that reproduces it, finds the code, and proposes labels, size and priority | new issues come to the owner as rows; the owner says what's ready |
| `design` | starts a worker that writes the design (§6) before any non-obvious implementation, and waits for the owner to accept it | nothing gates implementation on a design |
| `deliver` | starts a worker on each ready issue that implements it and drives its PR green | the manager tracks issues and PRs but writes nothing |
| `fix-ci` | starts a worker when a PR's or the base branch's CI fails | a failing check is a row for the owner |
| `rebase` | wakes or starts a worker when a green PR conflicts with its base | a conflict is a row for the owner |
| `adhoc` | starts a box for the owner to work in by hand, and brings that work into the process on `/submit` | – |
| `prototype` | starts a box for quick, process-free prototyping with the owner | – |

When `deliver` is on, ask two more:

- `deliver.review`: review every change to sign-off with `discobox-review`
  (fresh-eyes reviewer subagents) before its PR opens.
- `deliver.verify`: exercise every change at runtime (`verify`) before it's
  committed, not just tests.

At least one job must be on. A job that's off is never launched, and its
role isn't delegated (`scripts/request`).

## 6. How designs are written down (only when `design` is on)

Read what the repositories already do: an ADR directory, RFCs, design docs,
design discussions in issues, nothing. Ask, offering what you found first:

- **A file in the repository** (`design.artifact: file`): its `name` (ADR,
  RFC, design doc…) and `path` (the directory). The design worker follows
  that directory's existing format and numbering. Accepted when the owner
  merges its PR.
- **A comment on the issue** (`design.artifact: issue`): the worker writes
  the design as a comment on the issue. Accepted when the owner says so (in
  chat or a reply on the issue).

## 7. Labels: adopt what exists

For each repository, read its labels and how its issues are labelled (§4),
and propose what each concept in `docs/labels.md` maps to: the statuses, the
priorities (highest first), `autoReadyMax`, `flake`, `design`, `blocker`,
and `new` when the repository has a "needs triage" label. Map a concept to
an existing label only when it really means that, whatever it's called
(`in progress`, `WIP`, `P1`, `kind/flake`, `needs-triage`). **Leave a concept
unmapped (`null`) when no label fits**: its status lives in the manager's
status comment on the issue (`scripts/status`), and nothing is created.

Present one repository at a time as a table (concept → label, or "status
comment"), say which labels you left alone, and ask the owner to accept or
change it. Where repositories share a convention, put the mapping at the
top level of `labels` and only the differences in each repository's
`labels`.

No priority labels: `"priority": []` and `"autoReadyMax": null`; every
triage verdict then comes to the owner.

## 8. Existing issues, focus and capacity

Ask:

- **Open issues the manager hasn't seen** (`backlog.mode`): `wait` (triaged
  only when a slot is free and nothing is ready; recommended when there are
  many), or `ignore` (only issues filed from now on). Set `backlog.before` to
  today's date either way.
- **A focus milestone** (`focus.milestone`, optional): one of the milestones
  you read, ranked right after blockers.
- **What reaches the owner:** confirm `autoReadyMax` in plain words
  ("triaged issues at P2 or lower start without asking you; P0 and P1 come
  to you first").
- **Capacity** (read free disk first, `df -BG --output=avail /`):
  `workers.max` (default 4; 1 when starting small), `workers.triageMax`
  (default 2; 1 when starting small),
  `workers.harness` (default `claude-code`; `discobox admin harness ls`),
  `disk.minFreeGiB` (default 30, or a fifth of free disk if that's less).

## 9. Write it, and ask for access

Write every answer into `manager.json` (`docs/config.md`), set `name` (ask:
default "<owner's org> manager"), `self` from `git remote get-url origin`,
and `"configured": true`. Then:

```sh
scripts/config check
scripts/config jobs
for r in $(scripts/config repos); do scripts/status check $r; done
scripts/request --print | jq '{use: [.policies[] | "\(.file) \(.args.owner)/\(.args.repo)"], delegate: [.delegate.policies[] | "\(.file) \(.args.owner)/\(.args.repo)"]}'
```

A request over 32 policies fails here: ask the owner which repositories to
drop, or to run a second manager for the rest. A label `MISSING` from
`scripts/status check` is a typo in the mapping: fix it.

Show the owner a one-screen summary (repositories, account, the jobs on and
off, how designs are written, the label mapping, what reaches them) and ask
them to confirm. Then send `scripts/request` (background, keep its ID). It
replaces §4's setup grant with the manager's whole access and asks to
delegate the workers' roles. Say in one line what the owner is approving,
and wait.

## 10. Commit and hand over

Make sure §0's API is in place. Commit `manager.json` with a message saying
what was set up, push it to `main` (`github` skill, Pushing to this
repository), then run the `start` skill in this session.

Tell the owner, in a few lines: what it watches, which jobs it runs, that
it will ask before doing anything (and how to answer: "yes", "all", "1 and
3", "do triage on your own"), and that they talk to it here from now on, and
change any of it by asking.
