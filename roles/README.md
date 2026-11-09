# Roles

Each file here is a discobox **credential policy**: the GitHub routes one kind
of box may use, with `owner`, `repo` (and for a role that pushes,
`forkOwner`) filled in when it's bound. The file name is the role's name. A
worker is bound its role when the manager launches it, so it never has to ask
for GitHub, and nothing it does can reach past the role.

A job skill names its role in its frontmatter, `metadata.discobox.role`,
and that's what `scripts/launch` binds. The table below is a summary; the
skills are the source.

| Role | Bound to | Allows |
|---|---|---|
| `github-triage` | `triage-issue` workers | Read the repository and search issues; comment on issues; file issues |
| `github-deliver` | `deliver-issue`, `propose-design`, `fix-ci`, `rebase-pr` workers, and ad-hoc and prototype boxes (`submit`) | Triage's, plus git push and fetch to the repository and `forkOwner`'s fork; open and edit its PR; reply to review; mark ready; file issues |
| `github-manager` | The manager itself, once per watched repository | Read; file, comment on, label and close issues; edit its own status comment; re-run failed CI. No git, no PRs, no creating labels |
| `github-push` | The manager itself, for this repository (`self`) only, once it has one | Git fetch and push |

`forkOwner` is the repository's `fork` (`scripts/config repo R fork`): the bot's
login for `push: fork`, the repository's own owner for `push: branch`.

No role allows a merge (there is no merge route), a workflow dispatch, or any
write to a repository other than the one it was bound for. What a route can't
narrow is said in the skills and held by branch protection: a git push can
name any branch, `PATCH …/pulls/*` can close a PR as well as edit it, and
GraphQL queries read every repository the token can see. Protect each base
branch so only the owner can merge.

## The manager's own access

A box can give its workers only what it was delegated. The manager asks for
everything in one request, **generated** from `manager.json` and the worker
skills' roles, never written by hand:

```sh
scripts/request --print   # see it
scripts/request           # send it, wait for the owner
```

- **Use part**, in `GH_TOKEN`: `github-manager` for every repository,
  `github-push` for `self` when it's set.
- **Delegate part**: every role named by the skill of a job that's on
  (`scripts/config jobs`), for every repository. A job that's off delegates nothing.

The owner approves or denies each part on one screen. **An approved part
replaces the manager's binding of that kind**, which is why the request is
always generated whole: a repository or role left out is access lost.
Whenever `repos` or `jobs` change, or a skill's role changes, send it again.

## Adding a role

Write the policy file here, name it in the job skill's frontmatter, and send
`scripts/request` again. A role that pushes takes a `forkOwner` parameter;
`scripts/launch` and `scripts/request` pass it to any role that declares one.
