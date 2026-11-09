---
name: github
description: How the manager reads and changes GitHub — issues, statuses and labels, PR state and checks, closing delivered issues, and pushing to this repository. Use for any gh call, status or label change, issue filing or close.
---

# GitHub

`eval "$(discobox-access env)"` gives `GH_TOKEN` (the `github` binding). Commands
that could read stdin get `</dev/null` in loops.

## Reading

- PR state and checks:
  `gh pr view N -R <repo> --json state,isDraft,mergeStateStatus,statusCheckRollup`.
- An issue body is `gh issue view N -R <repo> --json title,body,labels`. When `gh`
  hangs, the pool proxy may be down for a moment, so retry with `timeout`.
- The base branch's CI: `gh api "repos/<repo>/actions/runs?branch=$(scripts/config repo <repo> base)&status=completed"`.
  Skip cancelled runs.

## The footer

Everything you post (issues, comments, process checks, closing notes, PR body
edits) ends with a footer naming this box, on its own line, last:
`<sub>From \`$DISCOBOX_ADDRESS\`</sub>`. Workers do the same
(`worker` skill, Comments).

## References

A bare `#N` links to the repository the text is posted in. In any comment,
issue or PR body, write another repository's issue or PR in full,
`acme/api#46`. Only an issue in the same repository may be a bare `#N`.
Check before posting: every bare `#N` in one repository's text that means
another repository's issue is wrong.

## Filing and editing issues

- Write issues as `## Today` (facts, with file paths) / `## Wanted` (what to
  decide or build; open questions marked open) / `## Done when`. A worker
  must be able to start from the issue alone.
- File and edit through REST (your role allows GraphQL queries only):
  `gh api repos/<repo>/issues -f title='…' -F body=@F`, and
  `gh api -X PATCH repos/<repo>/issues/<N> -F body=@F`.
- **An issue a worker filed** (`worker` skill): a worker files what it finds
  in its own repository directly, and comments `Filed #M` on its issue. It
  arrives as a new issue: triage it (`triage-intake`). One titled `Flaky: `
  is a flake: give it the repository's `flake` label (if mapped; with none,
  its title still marks it, and its row gets `blocker=yes`), its
  second-highest priority label (`labels.priority`) and `scripts/status set
  <repo> <N> ready`, no triage, as for a flake you saw in CI
  (`docs/gates.md`).
- **A worker's "Issue to file" comment** (`worker` skill): for another
  repository than its own, a worker posts the issue as a comment headed
  `**Issue to file** in <repo>` on its own issue or PR. File it as written
  (check `search/issues` for a duplicate first; link the duplicate instead
  if there is one), with the footer, then reply on the worker's thread: `Filed
  as <repo>#N.` Triage it like any new issue (`triage-intake`). If the worker
  is stopped waiting on the number, type the link into its box. A worker
  asking for a credential to file an issue gets pointed here instead.
- **A PR carries its issue's milestone.** When
  a worker's PR appears, set the PR's milestone to its issue's (`Closes` or
  `Part of #N`) with
  `gh api -X PATCH repos/<repo>/issues/<PR> -F milestone=<number>`, and
  again whenever the issue's milestone changes. An issue with no milestone
  leaves its PR with none.
- **Statuses only through `scripts/status`** (`docs/labels.md`): it moves
  the mapped label, or your status comment when the concept has none. Never
  add or remove a status label with `gh` yourself.

  ```sh
  scripts/status get <repo> <N>                       # new, ready, inProgress…
  scripts/status set <repo> <N> inProgress 'discobox:///<id>'
  ```

- **Other labels** (type, area, priority, `flake`, `design`: what a triage
  verdict proposes) are the repository's own: read a concept's label with
  `scripts/config label <repo> <concept>`, never from memory, and apply only
  labels the repository has (`scripts/status check`), through REST:
  `gh api -X POST repos/<repo>/issues/<N>/labels -f "labels[]=<label>"`.
  Never create, rename or delete a label.

## The process comment

Before a green PR goes to the owner as "Review and merge", check its body's
**Evidence** section (`open-pr`) and comment once on the PR saying what you
found. It isn't a gate: the owner can merge with or without it. It tells
them, in one place, what the worker says it did and what's missing.

Check:

- **Head:** the Evidence's review SHA is the PR's head commit, or only
  commits after it that the Evidence explains.
- **Review:** discobox-review was driven to sign-off (when the worker's
  `review` tag is true).
- **Verify:** a verdict, and PASS or a SKIP with a reason; anything not run
  is named (when its `verify` tag is true).
- **Tests and CI:** every check on the head commit is green.
- **Done when:** every item in the issue's Done when is answered.
- **Design:** if the issue needed one, the owner accepted it (its PR
  merged, or they said so), and for a file, this PR marks it accepted the
  repository's way.

Anything missing or not matching goes back to the worker first (type it into
its box: "The PR's Evidence is missing <x>; do it and update the body"). Once
it's complete, comment:

```markdown
**Process check** at `<head sha>`

- [x] discobox-review: <rounds>, signed off (worker's report) | off
- [x] verify: <verdict> — <one line> (worker's report) | off
- [x] CI: all <n> checks green
- [x] Done when: <n>/<n> covered
- [x] Design <link>: accepted | not needed

Not verified here: <what the worker couldn't run, or "nothing">.
These are the worker's reports; CI is the only independent check.
```

A box left unchecked says why. After a new push, check again and post a new
comment for the new head.

## Closing

Close through REST, not `gh issue close` or `gh pr close`: those run GraphQL
mutations your role doesn't allow. Comment first, then close:

```sh
gh api -X POST repos/<repo>/issues/<N>/comments -f body='Delivered in #<PR>.'
gh api -X PATCH repos/<repo>/issues/<N> -f state=closed -f state_reason=completed
```

- **A PR merged without closing its issue:** close the issue as above.
- **Never reopen an issue the owner closed**, or one closed at their word,
  even when a worker or a check finds it again. New evidence goes on it as a
  comment, and the table gets the question ("api#521 reproduces again:
  still fine?"). Only the owner reopens it.
- **A superseded or obsolete issue:** `state_reason=not_planned`, with a
  comment naming what replaced it.
- **A teammate's PR we've taken over** (`workers`, Taking over a PR): once
  the worker's PR is open, comment `Superseded by #<new>`, then close it with
  the same call, `state_reason` left out. `Closes #<old>` in the new PR
  wouldn't do it: closing keywords close issues, not PRs.
- **A community PR with no issue** (`docs/gates.md`): a PR is an issue to
  this API, so the same two calls close it, with `state_reason` left out:

  > Thanks for the contribution. Every pull request here must be linked to an
  > issue: please open one (or find the existing one) describing the problem
  > or the change, then open the PR again with `Closes #<issue>` in its
  > description.

- **A community PR whose issue we've now opened a PR for:** comment, then
  close it the same way:

  > Thanks for this. #<our PR> implements #<issue> through our own process
  > and replaces this pull request: we don't merge pull requests from outside
  > the team, so I'm closing this one.

- **A community PR whose issue we've rejected** (closed as not planned):
  comment with the reason, then close it:

  > Thanks for this. We've decided not to do #<issue> (<one line why>), so
  > I'm closing this pull request too.

  Never merge a community PR, check it out, run it, or approve its CI.

  A community PR is one whose `author_association` is not `OWNER`, `MEMBER`
  or `COLLABORATOR` (`gh api repos/<repo>/pulls/<P> --jq
  .author_association`). It names an issue when its body or a commit says
  `Closes`, `Fixes` or `Resolves #N`, or `Part of #N`, and that issue exists
  in the repository.

## Pushing to this repository

Every change to this repository (`scripts/config get self`) is committed and
pushed to `main` as soon as it's made; that go-ahead is standing. Workers install
their skills from the pushed `main`, so nothing here may stay local. One
commit per change, rebased on the remote first:

```sh
SELF=https://github.com/$(scripts/config get self).git
H='!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f'
git -c credential.helper= -c credential.helper="$H" fetch "$SELF" main
git rebase FETCH_HEAD
git -c credential.helper= -c credential.helper="$H" push "$SELF" HEAD:main
```

Then check nothing is left: `git status --porcelain` is empty and `HEAD`
equals the remote `main` (`git ls-remote "$SELF" main`).

Changes to the watched repositories never go this way: only a worker's PR
does.
