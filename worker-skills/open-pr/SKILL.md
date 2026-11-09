---
name: open-pr
description: Push the committed work to a branch on GitHub, open a pull request into the box's base branch, watch its CI checks, fix whatever fails, and repeat until every check on the PR's latest commit is green — then leave it for a human to merge. Used by deliver-issue, propose-design, fix-ci and submit.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Agent, SendMessage, Skill, Monitor, AskUserQuestion
metadata:
  argument-hint: "<branch-name>"
---

# Open a PR and drive it green

Put the local commits on a GitHub branch, open a PR into `BASE`, and keep
working until the PR's head commit passes every check. CI proves the change;
a human reviews and merges it.

`REPO`, `BASE`, `FORK`, `UP_URL`, `GH_URL` and the git credential helper come
from the `worker` skill. Push one branch to `$FORK` and nothing else, and
edit only this PR.

Invoking this skill is authorization to push **one** branch, open a PR from
it, push further commits to it, edit its body, mark it ready, and comment on
it. It is not authorization to merge, enable auto-merge, push `BASE`,
force-push, request reviewers, or close anything; ask for those, unless the
calling skill already has (`deliver-issue`).

## 1. What goes in the PR

The work must be committed: `git status --short` shows nothing tracked, and
anything else uncommitted is a question, not something to sweep in.

Fetch `BASE` from the repository (`git fetch "$UP_URL" "$BASE"`, with the helper) and
read what the PR would carry:

```bash
git log --oneline FETCH_HEAD..HEAD
git diff --stat FETCH_HEAD...HEAD
```

Those must be exactly this change's commits. A commit from someone else's
work or a different change means stop and ask; an empty list means there's
nothing to open. If `git merge-tree --write-tree FETCH_HEAD HEAD` reports a
conflict, rebase onto `FETCH_HEAD` now (nothing is published yet) and re-run
the tests the conflict touched.

**Branch:** `discobox/issue-<N>` for an issue, on `$FORK`. Check it's free: `git ls-remote "$GH_URL"
refs/heads/<branch>` returns nothing, or an ancestor of `HEAD` (this work's
earlier push). If it's taken by a PR that is already **merged or closed**
(an earlier round on the same issue), don't replace it: use the next free
`discobox/issue-<N>-2`, `-3`, ... and go on without asking. Anything else is
someone else's branch: stop and say so.

## 2. Push and open

Push `HEAD:refs/heads/<branch>`, then find or open the PR:

```bash
gh pr list --repo $REPO --head <branch> --state open --json number,url
gh api -X POST repos/$REPO/pulls -f base=$BASE -f head=$FORK:<branch> -F draft=true -F maintainer_can_modify=true \
  -f title="<conventional subject>" -F body=@<scratchpad>/pr-body.md --jq '.number, .html_url'
```

One PR per branch: if one is open, update its body instead (`gh api -X PATCH
repos/$REPO/pulls/<pr> -F body=@…`). It stays a draft until green, so nobody
reviews what CI hasn't passed. Tag the box `pr=<pr>` (`worker`, Tags), and
add the PR to its name (`worker`, Name the box).

Title: the commit's subject when there's one commit, else a conventional
subject covering them. Body:

```markdown
<What changed and why, three to six lines: the cause, the fix, what a
reviewer should look at first.>

Closes #<N>

## Evidence

- **Review:** discobox-review to sign-off, <rounds> rounds, at `<sha>`: <what
  it found and what changed> | not run (off for this repository)
- **Verify:** PASS | FAIL | BLOCKED | SKIP: <what was observed at the
  product's surface, or why there was nothing to run>; not run here:
  <paths, or none> | not run (off for this repository)
- **Tests:** <what ran and its result; pre-existing failures named>
- **Done when:** <each item of the issue's Done when, and how it's met>

<sub>From `<$DISCOBOX_ADDRESS>`</sub>
```

Fill in every line of **Evidence**, and say plainly when a step wasn't done
(`Verify: not run, because …`). A step your box's `review` or `verify` tag
is `false` for (`worker`, Where you are; missing means on) isn't run, and
its line says `not run (off for this repository)`: the manager reads it before the PR reaches
the owner, and sends back a PR whose Evidence is missing or doesn't match.

`Closes #N` when it delivers the issue; `Part of #N` when it's one step of it
(a design PR). End with whatever attribution line the harness asks PR
descriptions to end with.

## 3. Watch the checks

Everything here is about the PR's **head commit**, which must equal local
`HEAD`:

```bash
gh pr view <pr> --repo $REPO --json headRefOid -q .headRefOid
gh pr checks <pr> --repo $REPO --json name,state,bucket,link
```

While checks are pending, keep working if there's work; otherwise sleep with
a wake for when CI should be done (`worker`, Power), check again on waking,
and repeat.

- **Green**: every check is `pass` or `skipping`, and the repository's
  required checks are among them.
- **`cancel`**: CI cancels a run a newer push superseded. Cancelled on an
  older commit isn't a failure; on the head commit, re-list, then re-run it.
- **`fail`**: §4.

## 4. Fix, push, repeat

Read the failure. `gh run view --log-failed` refuses while the run is still
going; read a finished job's log through the API meanwhile:

```bash
gh api repos/$REPO/actions/jobs/<job-id>/logs | sed 's/\x1b\[[0-9;]*m//g' > <scratchpad>/job.log
```

1. **Is it this change?** Look at the latest runs on `BASE` (`gh run list
   --repo $REPO --branch $BASE --limit 5`). Failing there too means
   pre-existing: note it on the PR, and don't fix it here unless asked. A
   suspected flake gets one re-run, by pushing the same change again (`worker`,
   GitHub: you can't re-run the repository's jobs), after checking
   `/proc/loadavg`; failing twice isn't a flake.
2. **Reproduce it locally** where you can, fix the cause, and run the
   narrowest check that covers it. One failure can hide the next: a green
   job after a fix isn't proof it was the last problem.
3. **Review the fix** with `discobox-review`: a CI fix is new code. Skip
   it when the box's `review` tag is `false`.
4. **Commit, push** (fast-forward, never force), and go back to §3.

After five failed rounds, tag `blocked` and put the remaining failures in a
PR comment.

A conflict with `BASE` after the PR is open needs a rebase and a force-push:
ask first, unless the calling skill already has.

## Done when

The PR's head commit is local `HEAD`, every check on it is green, and the PR
is marked ready (`gh pr ready <pr> --repo $REPO`). Don't merge. Finish with
the PR URL, the head SHA, and every CI failure met with its fix, or the
pre-existing failures left.
