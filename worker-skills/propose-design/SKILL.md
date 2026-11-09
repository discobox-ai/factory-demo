---
name: propose-design
description: Write the design for one issue the way the team writes designs — a document in the repository in its own PR, or a comment on the issue — and stop once it's up for the owner, with no implementation. Use when a worker box is launched to propose the design for an issue ("design only").
metadata:
  discobox.role: github-deliver
  discobox.job: design
---

# Propose a design

**Read the `worker` skill first** (`REPO`, `N`, `BASE`, tags, GitHub). Your
`design` tag says where the design goes, `design-name` what the team calls
it (use that word throughout), and `design-path` the directory, for `file`.
`design=none` or missing: this box shouldn't exist; tag `blocked` and say so.

1. **Read the issue.** It names the questions the design must settle. Read
   the designs the issue cites and those they relate to. For `file`, read
   `design-path`: its README or index if it has one, and enough of its
   existing designs to learn their format, numbering and status convention.
   For `issue`, read how earlier designs were posted on this repository's
   issues, if any were.
2. **Read the code** the decision touches, so every claim about today is
   checked against `BASE`, with file paths.
3. **Write it** in the repository's own form (never another repository's).
   Answer each question the issue lists. Mark anything left to
   implementation as open, never decided by default. Record the alternatives
   you rejected and why. If the format records a status, give it the one a
   design not yet accepted gets (`Proposed`, `Draft`, whatever the
   repository uses).
4. **Put it up for the owner:**
   - **`file`:** in `design-path`, with the repository's numbering, and its
     index line if it keeps one. One PR, the design alone, from
     `discobox/issue-N-design`, with `open-pr` (its Evidence: the review and
     verify lines say not run, a design only). Title it as the repository
     titles such PRs, else `docs: propose <the decision in a phrase>`. The
     body says `Part of #N`, never `Closes`. Stop once it's green.
   - **`issue`:** one comment on the issue, starting with the heading
     `## <design-name>: <the decision in a phrase>` and ending with the
     footer (`worker`, Comments). A revision edits that comment and posts a
     one-line follow-up saying what changed.
5. **Stop:** tag `ready`. Don't implement, and don't mark it accepted. The
   owner accepts it by merging its PR (`file`) or by saying so (`issue`:
   the manager passes it on, or it's in the issue's comments); then a
   `deliver-issue` worker implements it.

A question the design can't settle without the owner (a product or trust
choice) is asked as `worker` says, and recorded in the design once answered.
