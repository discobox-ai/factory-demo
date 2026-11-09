---
name: fix-ci
description: Make a red CI green — a PR's, or the default branch's — by finding and fixing the cause, delivered as a PR. Use when a worker box is launched to fix failing CI or a flaky test.
metadata:
  discobox.role: github-deliver
  discobox.job: fix-ci
---

# Fix CI

**Read the `worker` skill first** (`REPO`, `N`, `BASE`, tags, GitHub). The
manager launched you with one of two targets, named in the prompt:

- **A PR** whose own worker has stopped (`pr=<P>` tag): make that PR green,
  on its branch.
- **`BASE`'s CI**, with an issue filed for it (`issue=<N>`): fix it in a new
  PR from `discobox/issue-N`.

1. **Find the failing run and job.** For a PR: `gh pr checks <P> --repo
   $REPO`. For `BASE`: `gh run list --repo $REPO --branch $BASE --status
   failure`. Read it as `open-pr` §4 says.
2. **Flake or real.** A failure unrelated to the commit's files that passes
   on re-run is a flake. A flake still gets fixed (it costs everyone
   re-runs), and the PR says it was one.
3. **Reproduce before fixing**: run the failing test locally, repeated, with
   the race detector where the language has one, and under load if it's
   timing-sensitive. Check `/proc/loadavg` first.
4. **Fix the cause.** Never lengthen a timeout or retry an assertion to hide
   it.
5. **Deliver it as a PR** with `open-pr` (for a PR target, push to its
   branch, fast-forward only; a rebase means asking first). Never a local
   commit or a push to `BASE`. The PR body names the cause and the
   reproduction that showed it. Review the fix with `discobox-review` unless
   your `review` tag is `false`, and run `verify` on a fix to product code
   unless your `verify` tag is `false` (`worker`, Where you are); the
   Evidence says which ran, and `not run (off for this repository)` for
   one that's off.
6. Drive it green and tag `ready`.
