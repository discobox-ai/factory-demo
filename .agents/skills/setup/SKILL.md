---
name: setup
description: Set this manager up for its owner, once, before the first /start — make sure the box can reach the discobox API, ask who it works for and as which GitHub account, which repositories it runs, which of its jobs the owner wants it to manage, how designs are recorded, inspect each repository's labels and adopt them, then write manager.json, ask for the manager's access and hand over to /start. Later, give the manager a repository of its own when the owner wants to keep it (§11). Use when manager.json says "configured": false, the owner types /setup, the owner wants to add a repository or change which jobs the manager runs, or the owner has forked or made a repository to keep the manager in.
---

# Setup

This checkout is a fresh copy of the manager starter template. Only a few
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

Refused means this box was started without `--discobox-api`. Ask for it
yourself: `discobox api-access request` puts the request in the owner's
approval inbox and waits for their answer. Never hand the owner a command
to run. Wait on it with the Monitor tool rather than asking them to tell you:

```
Monitor(command: "discobox api-access request --reason 'the manager creates, tags and steers one worker discobox per job' 2>&1; echo exit=$?",
        description: "waiting for the owner to approve this box's discobox API access", timeout_ms: 1800000)
```

Say in one line that it's waiting in their approvals. `API access enabled`
(exit 0) means approved. A denial (non-zero exit): tell the owner the
manager can't start workers without it, and stop at §10 until they approve
a new request.

Go on to §1 meanwhile; nothing before §10 needs the API.

## 1. Where you are

```sh
jq '{configured, self, upstream}' manager.json
git remote get-url origin; git status --short
discobox-access list
```

`origin` is the GitHub repository this box was started from. `upstream` is
the template's own name (shipped in `manager.json`; nothing is ever pulled
from it). `self` is the manager's own repository, empty until the owner
gives it one (§11):

- **`self` is empty:** the manager lives in this box's checkout, committed
  locally. That's the usual first run, and nothing needs creating before the
  owner has seen it work. If `origin` isn't `upstream` (started from the
  owner's own fork or copy), ask whether it's the manager's repository; if so,
  it's `self` (§11, from "Once it exists").
- **`self` is set and `origin` is it:** a re-run. Go on.
- **`self` is set and `origin` is something else** (a new box started from
  the template again, say): the manager's real settings are in `self`. Ask
  the owner whether to switch this checkout to it (§11, "Switching"), and do
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

## 3. Where the manager is kept

Nowhere yet, and don't ask. The manager's settings and skills are this
checkout, committed locally as they change (`github` skill, Keeping this
repository); workers get their skills copied from it. Keeping it in a
repository of its own is the owner's to do once they've seen it work: §10
tells them how, and §11 picks it up when they have.

## 4. Which repositories

Ask for the repositories, as `OWNER/REPO`. Leave the manager's own (`self`, if it
has one) out unless the owner wants its changes to go through issues and
PRs too; the manager pushes it directly.

Then ask for what setup needs, in one request: read the repositories (and
push to `self`, when it's set):

```sh
REPOS="acme/web acme/api" scripts/request --setup
```

Run it in the background, say in one line that it's waiting for the owner's
approval, and go on once it's granted (`eval "$(discobox-access env)"`).

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
default "<owner's org> manager"), and `"configured": true`. Leave `self` as
§1 found it. Then:

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
what was set up (`github` skill, Keeping this repository; pushed too when
`self` is set), then run the `start` skill in this session.

Tell the owner, in a few lines: what it watches, which jobs it runs, that
it will ask before doing anything (and how to answer: "yes", "all", "1 and
3", "do triage on your own"), and that they talk to it here from now on, and
change any of it by asking.

When `self` is empty, add one short paragraph, and don't ask anything about
it: its setup is committed only in this box, so removing the box loses it.
To keep it, once they've seen it work, they fork `upstream` on GitHub (a fork
of a public repository is public), or make an empty private repository, and
tell you its name; you take it from there (§11). Nothing is needed before
then.

## 11. Later: a repository of its own

When the owner says where to keep the manager (they forked `upstream`, or
made an empty repository), as `OWNER/NAME`. Don't create it yourself.

**Once it exists:** write it to `self` in `manager.json` and send
`scripts/request` (background, keep its ID): the manager's access now
includes `github-push` for it. Say in one line what the owner is approving.
Commit that change. Once it's granted, point `origin` at it (unless it
already is: a box started from the owner's own fork) and push this checkout:

```sh
eval "$(discobox-access env)"
SELF=$(scripts/config get self)
git remote rename origin upstream
git remote add origin https://github.com/$SELF
H='!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f'
git -c credential.helper= -c credential.helper="$H" fetch origin
```

A fork has the template's history, which this checkout shares: push with
`git -c credential.helper= -c credential.helper="$H" push -u origin HEAD:main`.
A fork the owner has changed on GitHub since, or a repository that isn't
empty: rebase onto `origin/main` first, and ask before discarding anything.
A fork takes a few seconds to appear: retry the fetch for a minute before
calling it failed. From here on every change is pushed (`github` skill).

**Switching** (§1, `self` set but `origin` isn't it): with the owner's yes,
point `origin` at `self`, fetch its `main`, and check it out
(`git remote rename origin upstream; git remote add origin
https://github.com/$SELF; git fetch origin main; git checkout -B main
origin/main`). Local changes: ask before discarding them.
