---
name: triage-issue
description: Triage one GitHub issue — read it, find the code it concerns, reproduce it, write a failing test and post it on the issue, and propose its kind, its labels from the repository's own (type, area, priority, whatever it uses) and its size in one triage comment, ending on a verdict of whether it is ready to deliver. It never fixes anything and never sets labels (the manager applies them). Use when a worker box is launched to triage an issue.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Agent, SendMessage, Skill, Monitor, AskUserQuestion
metadata:
  discobox.role: github-triage
  discobox.job: triage
  argument-hint: "<issue-number>"
---

# Triage an issue

One issue, from new to reproduced, classified, and judged ready or not.
Triage ends at a verdict; it does not fix. Delivery is a new box, started by
the manager from what this triage posts, so **everything the next box needs
goes in the triage comment**.

**Read the `worker` skill first.** It gives you `REPO`, `N` and `BASE`, your
tags, how to ask the owner, and your GitHub access (role `github-triage`:
read, search, and comment on issues; no labels, no pushes).

Invoking this skill is authorization to read the repository and its issues,
check out commits to reproduce, and post the triage comment and short
follow-ups on issue `N`. It is not authorization to label, close, lock,
assign, retitle or edit the issue, or to push anything.

## 1. Read and investigate

```bash
gh api repos/$REPO/issues/$N
gh api "repos/$REPO/issues/$N/comments?per_page=100"
gh api "search/issues?q=repo:$REPO+<key+terms>&per_page=20"
```

- Read every comment and the issues it names. If an earlier triage comment
  is there, this is a re-triage: correct it (§4), never post a second one.
- Find the code it's about, and read the repository's docs down to it
  (`worker`, The repository says how it's built). For a broad sweep, hand it
  to an `Explore` agent and keep only the conclusion.
- Check `git log --oneline -S '<symbol>'` and `--grep` for a fix already on
  `BASE`, the search above for duplicates, and the repository's designs
  (wherever its `AGENTS.md`/`CLAUDE.md` or docs keep them, or earlier
  issues' design comments) for a decision that already covers or rejects
  the request.
- Note the version the reporter ran, if they said.

Status line: `investigating #N: <the code it concerns>`.

## 2. Reproduce

Required for a bug or a flake. For anything else, confirm briefly that the
current behaviour is what the issue describes, and go on to §3.

**Where:** `BASE` first, where the box starts. Only if it doesn't reproduce
there, the reported version, to tell "already fixed" from "can't reproduce":
switch to it only with a clean tree (`git status --porcelain
--untracked-files=no` empty; never stash, reset or check out a file to make
it clean), and switch back every time, failure or not.

**How, narrowest first:**

1. **A test** in the package or module that owns the defect, in the
   repository's own test style and helpers. This is the goal.
2. **The product's own surface** (its CLI, API or UI), run the way the
   repository's `verify-recipes` skill says (if it has one; else its docs),
   for flows no test reaches.
3. **An end-to-end suite**, when the bug lives in the full flow.

For a flake, check `/proc/loadavg` first, then run it many times (and with
the race detector or the language's equivalent where there is one), and
report the failure rate, not one run.

**The failing test:** write it beside the tests it resembles, named for the
behaviour, not the issue number. Run it and confirm it fails **for the
reported reason** (an assertion naming the wrong behaviour, not a compile
error, timeout or missing fixture). It goes in the triage comment in full,
so the delivering box can start from it. Leave it uncommitted; this box
pushes nothing.

**Record exactly one result:**

- **Reproduced**, by the failing test or by exact commands and their
  output, at a named commit.
- **Seen in code**: visible at `file:line` but no test can reach it; say why.
- **Fixed on `BASE`**: reproduced at the reported version, not now. Name the
  fixing commit if `git log` finds it.
- **Not reproduced**: what was tried, at which commits. The verdict asks the
  reporter specific questions.
- **Needs another OS**: the defect only shows on an OS this box isn't
  (`uname -s`). Say what the code shows, with `file:line`.

Status line: `reproduced #N: <result>`.

## 3. Classify

Say what **kind** of issue it is, in one word: `bug`, `feature`, `chore`,
`flake` (a test that fails intermittently) or `decision` (the issue is a
design decision itself). The manager reads it whatever the labels are.

Then propose **labels from the repository's own**. There's no fixed scheme:
read what it has, with their descriptions, and how its recent issues are
labelled:

```bash
gh api "repos/$REPO/labels?per_page=100" --paginate --jq '.[] | "\(.name)\t\(.description // "")"'
gh api "repos/$REPO/issues?state=all&per_page=30" --jq '.[] | select(.pull_request == null) | "#\(.number) \([.labels[].name] | join(", "))"'
```

- Propose whatever dimensions the repository labels by (a type or kind, an
  area or component, a priority or severity, a platform), one label per
  dimension unless the repository plainly uses several (areas often).
- **Area** follows ownership, not the symptom. **Platform** only when the
  cause is specific to that OS, not where the reporter happened to run.
- **Never invent a label.** If none fits a dimension, say so in the comment.
- **Never propose a status label** (triaged, ready, in progress, blocked,
  needs-*, or whatever the repository calls them): status is the manager's.
- **Priority**, when the repository has priority labels, by what they mean
  there (read their descriptions), roughly:

| Priority | Means |
|---|---|
| Highest | Security or credential exposure, data loss, or unusable for everyone; no workaround |
| High | A core flow broken for some users, or a regression |
| Medium | Broken with a workaround, or a clearly wanted enhancement |
| Low | Polish, rare edge cases, nice-to-haves |

A flake is at least the second-highest priority, whatever else it touches: a
flaky test breaks CI for every PR. Propose the repository's flake label too,
if it has one.

Then judge its **size** from what you know of the fix:

- **small**: the cause is pinned to `file:line`, the fix is obvious from it,
  stays in one package (its tests and docs included), and has one defensible
  shape;
- **medium**: the cause is known, but the fix crosses packages, changes an
  interface or a persisted shape, or touches an API contract;
- **large**: a redesign, a new feature, or a fix whose shape isn't known yet.

Status line: `classified #N: <kind> · <labels> · <size>`.

## 4. The triage comment

**A security issue gets no public detail.** For a credential or secret
exposure, an authorization bypass, or anything else at the highest priority
for security, the comment says only the first line and "Reproduced; details
withheld." Put the test and the cause on your screen instead, tag `blocked`,
and suggest moving the report to a private security advisory.

Otherwise, one comment, short and factual, without restating the issue.
**Its first line is what the manager parses**: keep its form,
`**Triage:** <kind> · size <small|medium|large> · labels <each label in
backticks, comma-separated>` (`labels none` when nothing fits).

````markdown
**Triage:** bug · size small · labels `bug`, `area: jobs`, `P1`

**Reproduced** at `75d03587` by the test below.
Cause: `internal/jobs/retry.go:212` returns the superseded error as a
failure, so the newer job backs off.

<details><summary><code>internal/jobs/retry_test.go</code></summary>

```go
func TestSupersededJobDoesNotBackOff(t *testing.T) { ... }
```

```
$ go test ./internal/jobs -run TestSupersededJobDoesNotBackOff
--- FAIL: TestSupersededJobDoesNotBackOff (0.02s)
    retry_test.go:41: backoff = 2s, want 0
```
</details>

**Next:** ready to deliver

<sub>From `discobox://…`</sub>
````

`Next` is one of:

- ready to deliver;
- ready to deliver, needs a design first (name the choice);
- needs a decision between X and Y;
- needs `<specific info>` from the reporter (version, exact command, output,
  OS; never "more details please");
- needs a macOS / Windows box;
- duplicate of #M;
- fixed on `BASE` by `<sha>`.

When your proposal reverses a label someone else set, or moves the priority,
say so. Post it with `gh api -X POST repos/$REPO/issues/$N/comments -F
body=@<file>`. A re-triage edits its own earlier comment (`PATCH
repos/$REPO/issues/comments/<id>`) and posts a one-line follow-up saying what
changed and why.

Status line: `commented #N: <url>`.

## 5. Verdict

Tag the box `ready`, and end on exactly this line, last on the screen:

```
triaged #N: <kind> · <size> · <labels> · <result> — <next>
```

Then stop. Don't deliver, and don't ask whether to: the manager decides
from the comment, and delivery is a new box. If you're asked to triage
another issue here, say it needs a new box.

## Done when

- The issue has one triage comment whose first line proposes its labels and
  size, with the reproduction (withheld for a security issue).
- The box is tagged `ready` (or `blocked`, for a withheld security issue),
  the last line on the screen is the verdict, and the box is powered off
  (`worker`, Power).
