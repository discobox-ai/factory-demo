---
name: adopt
description: Pull a box the owner started by hand into the process — find it, adopt it, write its issue, tag it, give it its role's credential, and brief it as a worker. Use when the owner says /adopt <box id or a description of the box>, "adopt box X", or "submit box X" for a box you didn't create.
---

# Adopt a box

The owner started a box on their own, outside the process: it has no `repo`,
`job` or `fork` tags, no worker skills, and no role-bound credential. Don't
ask the box to run the process itself: it gets confused trying.
You do the process part: you lead it, you write its issue, you tag it, you
give it its credential, and you tell it, in plain words, what to do next.
The box never files anything and never asks for a credential.

## 1. Find the box

The argument is a box ID (`sbx_…`, or a prefix) or a description ("the
tooltip box", "the one fixing the login page"). Match a description against
`discobox ls -o json`: name, description, tags, source, branch. One clear
match: use it. More than one, or none: say so to the owner in one line with
the candidates, and wait. Never guess.

A box that already has `job` and `fork` tags and is yours is already in the
process; say so and stop.

## 2. Adopt it

```sh
discobox adopt <id> --reason "The owner's box joins the manager's process"
```

Run it in the background: it waits for a person. Table row: "Approve the
adoption of box <id>" (`!` in the console). It's yours when `discobox ls`
shows this box as its PARENT.

Then tell the box what is happening, so it doesn't guess (`workers`, Type
into a worker; only when it's idle at its prompt):

```sh
discobox send <id> 'The manager has adopted this box to bring your work into its process. Stop where you are and wait: it will file an issue for this work, set your tags and credential, and tell you the next step here.' && discobox send-key <id> Enter
```

## 3. Learn what it did

- Its screen and scrollback: `discobox capture <id> --scrollback 400 --trim`.
  A Codex box keeps no scrollback.
- Its `ls` row: source repository, branch, changes, diff size.
- Its history and working tree: `discobox exec <id> -- git -C <dir> log
  --oneline origin/HEAD..` and `git diff --stat`, and for Codex
  `~/.codex/sessions/`. If exec or cp into the adopted box is refused, use
  the screen and ask the owner in one line what you can't see.
- The owner's own words when they asked you to adopt it.

## 4. Its issue

The box doesn't file it; you do (`github` skill: Today / Wanted / Done when,
the footer, search for a duplicate first). If an issue already covers the
work (the box's `issue` tag, or a match), use that one and comment what the
box has done. Write what is built and where (branch, files), what's left, and
how it's checked. Then triage it like any new issue (`triage-intake`): it may
need a design before the work goes on, or a decision from the owner.

## 5. Tags

The same tags `scripts/launch` sets for that job (`workers`, Launch):

```sh
FORK=$(scripts/config repo <repo> fork) BASE=$(scripts/config repo <repo> base)
discobox tag <id> repo=<owner>/<name> issue=<N> job=<deliver|design|adhoc> fork=$FORK base=$BASE \
  review=$(scripts/config get deliver.review) verify=$(scripts/config get deliver.verify) \
  design=<design.artifact, or none> design-name=<design.name> design-path=<design.path> \
  --description '<name>#<N>: <title>'
```

`base` is the repository's `base` in `manager.json` (what its PR targets).
`fork` is where its workers push: the manager's account's fork, or the
repository itself (`push: branch`). `job=deliver` when the issue is ready to
implement; `job=design` when it needs a design first; `job=adhoc` while it
waits on the owner. Only a job that's on (`scripts/config jobs`): its role is
delegated only then. `review` and `verify` go only on `deliver` and
`adhoc`; `design=none` with the design job off, and then no `design-name`
or `design-path` (none either when `design.path` is empty). None of
`deliver`, `design` or `adhoc` on: the box can't join; tell the owner.

## 6. Its credential

Give it what `scripts/launch` would have bound for that job: the role from
the job's worker skill (`discobox.role` in its frontmatter), for this
repository and fork. Try binding it directly:

```sh
discobox secret bind "$GH_SECRET" <id> --as GH_TOKEN --for 2w \
  --policy roles/<role>.json --policy-arg owner=<owner> \
  --policy-arg repo=<name> --policy-arg forkOwner=$FORK
```

(`discobox secret bind --help` for the exact argument order.) The server
may refuse a direct bind by a box (`403 ... not in the sandbox role`). When
it does, the box asks instead (step 7 tells it how), and
you approve its request as its parent with `discobox secret request approve
<id>`, **without `--secret`** (`workers`, Credential requests). It is exactly
what you would have bound at launch. Check it asks for its job's role, not a
wider one; a wider request goes to the owner.

## 7. Brief it

It has no worker skills, so the message carries the rules. Wait until it is
idle at its prompt, then send one message with `discobox send <id> '…' &&
discobox send-key <id> Enter`:

> You've joined the manager's process for <owner>/<name> issue #<N>
> (<link>). Your GitHub credential is GH_TOKEN, bound for this job; use it
> and no other for anything on GitHub. Next: <deliver: rebase on
> <base>, push branch discobox/issue-<N> to <fork>/<name>, and open
> a PR into <owner>/<name> whose body says Closes #<N>; get every check green
> | design: write the design for #<N> as a <design.name> in <design.path>,
> in its own PR, following the repository's format (file), or as a comment
> on #<N> (issue), and stop there>. Never
> merge, never push to <base>, never change labels or close issues.
> If you need a decision, tag this box needs-input, ask the owner here, and
> wait.

When cp into the box works, copy the job's worker skill and `worker`
from `worker-skills/` into the box's skills directory instead, and type
"Run /<skill> for #<N>".

## 8. From here

It's a worker like any you launched: on the table, watched, checked by the
`github` process checks, retired by `workers` when its PR merges.
