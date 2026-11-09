---
name: rebase-pr
description: Rebase an open PR's branch onto its base after the base moved and the PR conflicts, keeping both sides' changes, and get it green again. Use when a worker box is launched to rebase a PR.
metadata:
  discobox.role: github-deliver
  discobox.job: rebase
---

# Rebase a PR

**Read the `worker` skill first** (`REPO`, `BASE`, tags, GitHub). The PR is
the `pr=<P>` tag; its branch is `gh pr view <P> --repo $REPO --json
headRefName -q .headRefName`.

Invoking this skill is authorization to force-push that one branch with a
lease. Nothing else.

1. Fetch the base from the repository and the branch from `$FORK` (never a
   local mirror): `git fetch "$UP_URL" "$BASE"` (keep its `FETCH_HEAD`), then
   `git fetch "$GH_URL" <branch>`, and check out the branch.
2. Rebase onto the base you fetched. Resolve every conflict so **both
   changes are kept**; never drop the base's change to make yours apply.
   Re-run generators instead of hand-merging generated files.
3. Run the tests of what the conflicts touched, and the repository's checks.
4. Push with an explicit lease on the branch's head on GitHub, and only to
   that branch:
   `git push --force-with-lease=refs/heads/<branch>:<its head on GitHub> "$GH_URL" HEAD:refs/heads/<branch>`.
5. Drive CI green (`open-pr` §§3–4) and tag `ready`. A conflict you can't
   resolve keeping both sides: tag `blocked` and say which, in a PR comment.
