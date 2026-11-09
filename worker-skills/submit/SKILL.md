---
name: submit
description: Bring the work of an ad-hoc or prototype session into the process — take stock with the owner, file or find its issue, settle any design choice the way the team writes designs, then either carry the code on to a PR in this box, park it on a pushed branch, or keep only the design. Use when the owner types "submit" (or /submit) in an ad-hoc or prototype box, or the manager types it on the owner's behalf.
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Agent, Skill, Monitor, AskUserQuestion
metadata:
  discobox.role: github-deliver
  discobox.job: adhoc
---

# Submit an ad-hoc session

An ad-hoc box is one the manager started for the owner to work in by hand
(tagged `job=adhoc`). Nothing in it followed the process: a design may have
been settled in conversation, code may be half written, nothing is filed. This
skill turns whatever is here into the process's terms, so that from the end of
it on, the work is like any other: **an issue, with every PR naming it.**

It does not assume the work is finished, and often no PR comes out of it.

**A prototype box** (tagged `job=prototype`, from the `prototype` skill) is
the same, with two differences. Its `~/prototype.md` is your first source for
§1: **Decided**, **Works**, and **Shortcuts**, every one of which goes into
**Missing**. And its code was built to answer a question, not to ship: it is
never the PR as it stands. *Carry on* (§4) means `deliver-issue` takes it the
whole way, replacing each shortcut, with the tests, review and verify the
prototype skipped; recommend *park* or *design only* when the shortcuts are
most of it.

**Read the `worker` skill first.** It gives you `REPO` and `BASE`, your tags,
how to ask the owner, and your GitHub access (role `github-deliver`). The
owner is usually at this box, and this skill asks them several things:
tag `needs-input` before each question, as `worker` says. They may have said
"submit box X" to the manager and gone elsewhere.

Invoking this skill is authorization to: file one issue in this box's
repository (or comment on an existing one), push the branch
`discobox/issue-<N>` and, only in §4's *carry on*, open a PR from it, as
`deliver-issue` describes. It is not authorization to push any other branch,
merge, close, relabel, or edit an issue's body. **Labels are the manager's**:
you propose them in §5's comment, and it applies them.

## 0. Before anything

- **The repository** is the `repo` tag (`worker`, Where you are). Missing on
  an ad-hoc box: ask the owner, and never guess from a git remote.
- **One submit per box.** An `issue` tag already set means this box has been
  submitted. Re-running is fine only to carry on what that issue says; never
  file a second issue from the same box.
- Never sit idle (`worker`, Power): when you end, power off.

Status line: `submitting: <repo>`.

## 1. Take stock

Read back the conversation, `~/prototype.md` on a prototype box, and the
working tree (`git status`, `git diff`
against `BASE`, `git log` of anything committed here), then run
the tests of what was touched. Tell the owner, in at most ten lines:

- **Decided:** each design choice the conversation settled, and the
  alternative it rejected.
- **Built:** what the code does now.
- **Missing:** what the work needs before it's done, including tests and
  docs.
- **State:** builds or not, tests pass or fail (name them).

Ask the owner to correct it (`AskUserQuestion`: "Right as written" /
"Corrections"). Everything after this is built from the corrected version, so
get it right here.

Status line: `stock taken: <one line>`.

## 2. The issue

Search first: `gh api 'search/issues?q=repo:<repo>+is:issue+is:open+<terms>'`.

- **One already covers it:** confirm with the owner. Then add what the session
  decided and built as a comment on it. Don't edit its body. Its number is
  `<N>`.
- **None does:** file one with `gh api -X POST repos/<repo>/issues`. Write it
  so a worker who never saw this conversation can carry on from it alone:

  ```markdown
  ## Today
  What the code does now, with file paths, before this work.

  ## Wanted
  What the session decided, each choice with the alternative it rejected.

  ## Done when
  The whole job, not only what is built: behaviour, tests, docs.

  ## Where it stands
  Filled in by §5's comment.
  ```

  Title it as the change, not the session ("github-repo polls with
  conditional requests", not "ad-hoc work"). If the work is part of a
  tracking issue, say `Part of <repo>#<T>` at the top.

Tag the box `issue=<N>` (`tag issue <N>`, `worker`, Tags). Name the box for it
(`worker`, Name the box). Status line: `issue <repo>#<N>`.

## 3. The design gate

It follows your `design` tag (`worker`, Where you are). If the session
settled a design choice with a plausible alternative, and `design` is `file`
or `issue`, it needs a design. Write it as `propose-design` §§1–3 say: the
context from the code, the decision, and the rejected alternatives, taken
from §1's **Decided**. Then put it up as `propose-design` §4 says:

- **`file`:** its own PR, from `discobox/issue-<N>-design`. The owner reads
  it there, in full, and merging it is the acceptance. Commit it on its own,
  and tell the owner the PR's URL.
- **`issue`:** its own comment on the issue, with `propose-design`'s heading.
  The owner accepts it by saying so, on the issue or to the manager.

Don't ask the owner to accept it in the box: it's read where it lives. The
code waits for it (§4, *wait for the design*).

`design=none`: no design step. The choices are already the owner's, made in
this session: they go in the issue's `## Wanted`.

No design choice, or only obvious ones: no design. Say which in §5.

Status line: `design: <id> in #<P> | in a comment on #<N> | none`.

## 4. The code

With a design from §3, it's **wait for the design**, without asking:
commit the work in progress (`commit` skill wording, `wip:` prefix if it
doesn't build), push it to `discobox/issue-<N>`, open no PR, and stay. When
the owner accepts the design, the manager wakes this box and it carries on as
`deliver-issue` from its §0 design gate and §1 (for `file`, recording the
acceptance as the repository's design format does).
This box keeps the context; a fresh worker would start cold.

With no design, ask the owner which of three it is (`AskUserQuestion`),
recommending one:

- **Carry on here.** Finish it in this box, unattended if the owner leaves:
  run `deliver-issue` from its §1 (Implement) with `<N>`, through review and
  verify (each unless its tag is `false`, saying so in the PR's Evidence),
  the PR and keeping it mergeable until merged.
- **Park it.** The work stays for later, or the owner wants a fresh worker on
  it. Commit the work in progress as it is (`commit` skill wording, `wip:`
  prefix if it doesn't build), push it to `discobox/issue-<N>`, and open no
  PR. The next worker starts from that branch.
- **Design only.** The code was a sketch, and only what it taught is kept, in
  the issue. Push nothing.

Recommend *carry on* when the work is close and nothing waits on the owner;
*park* when a lot remains; *design only* when the code would mislead a worker
more than help.

Status line: `code: carry-on | waiting on #<P> at <sha> | parked at <sha> | design-only`.

## 5. Hand it over

Post one comment on the issue, in this form exactly. The manager reads it to
set the issue's labels and decide what happens next, and a fresh session of
the manager rebuilds from it:

```markdown
**Submitted from an ad-hoc session** (box `<box id>`, ad-hoc | prototype)

- **Outcome:** carry-on | waiting-on-design | parked | design-only
- **Branch:** `discobox/issue-<N>` at `<sha>` | none
- **Design:** <id> in #<P> | in a comment on this issue | none
- **Proposed labels:** <label>, <label>, … (only labels the repository has: `gh api "repos/$REPO/labels?per_page=100"`; its type, area and priority, whatever it uses, never a status)

### Where it stands
What is built and what state it is in (build, tests).

### What's left
The rest of `## Done when`, as a list a worker can start from.
```

Status line: `submitted: <repo>#<N>, <outcome>`.

Then:

- **carry-on:** keep going as `deliver-issue`; its tags and sleeping carry on
  from here, as they do for any delivering worker.
- **waiting-on-design:** tag the box `blocked` and power off. The manager
  wakes it when the owner accepts the design (merges its PR, or says so),
  and it carries on as `deliver-issue`.
- **parked** or **design-only:** tag the box `ready` and stop. The manager
  retires the box.

## Done when

The issue holds §5's comment, and either the box carries on as
`deliver-issue`, or it is tagged `blocked` waiting on its design, or it is tagged `ready` with the branch pushed (*parked*)
or nothing pushed (*design-only*). Finish with the issue URL, the outcome,
the branch and SHA if any, and the design if any.
