---
name: workers
description: Start, steer, check and retire worker discoboxes for the manager. Use when launching a worker for an issue, typing into one, reading its screen, answering its mechanical prompts, approving its credential requests, or retiring it.
---

# Workers

The box's own environment already points `discobox` at the right server:
don't set or unset `DISCOBOX_SERVER`, `DISCOBOX_API_URL` or `DISCOBOX_TOKEN`.
GitHub comes from:

```sh
eval "$(discobox-access env)"   # GH_TOKEN
```

## Launch

**Use `scripts/launch`.** It reads the harness, the fork and the base branch
from `manager.json` (`scripts/config`), the role from the worker skill, and
the one delegated GitHub secret; refuses a job that's off (`scripts/config jobs`),
and while this checkout is dirty or unpushed or `workers.paused` is true;
runs the box; tags it; moves a deliver or design issue to `inProgress`
(`scripts/status set`).
Never type `-H <harness>` or the rest of the command by hand: a hand-typed
harness only matches `manager.json` until the owner changes it.

**Ask first.** A job not in `manager.json` `auto` launches only after the
owner said yes to it (`AGENTS.md`, Ask first): propose it, then launch with
`--confirmed`. `scripts/launch` refuses otherwise. Waking, steering,
rebasing and retiring a worker of such a job are proposals too. A box the
owner asked for (ad-hoc, prototype) is already their yes.

```sh
scripts/launch deliver-issue --repo acme/web --issue 566
scripts/launch triage-issue  --repo acme/web --issue 561
scripts/launch propose-design --repo acme/web --issue 564
scripts/launch deliver-issue --repo acme/api --issue 33 -p 'Deliver #33. Investigate first and report before changing code.'
scripts/launch triage-issue  --repo acme/web --issue 561 --confirmed   # the owner said yes
scripts/launch ... --dry-run     # print the harness, role and command, launch nothing
```

Then add the table row (`scripts/table add`). What follows is what the script
does, for reading and for launches by hand.

First make sure this checkout is committed and pushed (`github` skill, Pushing
to this repository): `--skills` installs from the pushed `main`, not from
local files.

**The GitHub secret's name is whatever the owner bound you**, not
necessarily `github`: the owner picks the secret when approving your request.
Read it from your delegations each time, the one credential you may delegate
that reaches `api.github.com`:

```sh
GH_SECRET=$(discobox-access list -json | jq -r '[.credentials[]
  | select(.purpose == "delegate" and (.hosts | index("api.github.com")))
  | .name] | if length == 1 then .[0] else "" end')
```

Empty means none or more than one: launch nothing, and tell the owner which
(`discobox-access list`). Never fall back to `github`.

**Workers run the harness `workers.harness` names:** read it with
`HARNESS=$(scripts/config get workers.harness)` and pass `-H "$HARNESS"`
to every `discobox run` below. Boxes already running keep theirs. The prompts
and the screen-reading in this skill were written against Claude Code (its
permission prompts, `AskUserQuestion` dialogs): check a new harness's first
boxes before trusting the rest. A box trusts its own folder at every start:
a "Trust this folder?" dialog on a
worker is a bug in the harness. Don't press Enter on it; tell the owner with the
box's ID and the server version.

**Workers push where the repository's `push` says:** to the manager
account's fork (`push: fork`), or to a branch in the repository itself
(`push: branch`). A role that pushes (`github-deliver`) takes `forkOwner`,
and the box gets a `fork` tag:

```sh
FORK=$(scripts/config repo <repo> fork)   # github.login, or the repository's owner
BASE=$(scripts/config repo <repo> base)
```

Run it from this repository's root, binding that secret with the role the job's
skill names in its frontmatter, `metadata.discobox.role` (`roles/README.md`).
Read it each time rather than remembering it; a skill's role changes with
the skill:

```sh
sed -n '/^---$/,/^---$/p' worker-skills/<skill>/SKILL.md | sed -n 's/^ *discobox\.role: *//p'
```

An ad-hoc box takes `submit`'s role. A role that isn't in the delegate part
of your approved request, for that repository, is refused at launch: send
`scripts/request` again (it's generated from the worker skills' roles) and
wait for the owner (`roles/README.md`).

`discobox run` resolves the repository and `--skills` with this box's own
git, which has no GitHub login: without the helper below every launch fails
with `could not read Username for 'https://github.com'`.

```sh
H='!f() { echo username=x-access-token; echo "password=$GH_TOKEN"; }; f'
export GIT_CONFIG_COUNT=2 GIT_CONFIG_KEY_0=credential.helper GIT_CONFIG_VALUE_0= \
  GIT_CONFIG_KEY_1=credential.helper GIT_CONFIG_VALUE_1="$H"
discobox run -d -H "$HARNESS" --skills "$PWD/worker-skills" \
  --bind "$GH_SECRET:GH_TOKEN,policy=roles/<role>.json,owner=<owner>,repo=<name>${FORK:+,forkOwner=$FORK}" \
  https://github.com/<repo>@$BASE \
  -p 'Deliver issue #<N> in <repo>.'
```

- **Keep the prompt short: the task and its scope only.** Put everything the
  worker needs into the issue. The proxy judge clips a prompt at 256 bytes and
  reads the cut as hidden instructions. A prompt that mentions credentials,
  grants or discobox-access gets refused as handing out privileges.
- **Name the job's limits in the prompt** when they differ from the skill:
  "design only: stop once it's ready for the owner".
- **Tag the box right away**, before anything else:
  `discobox tag <id> repo=<owner>/<name> issue=<N> job=<job> fork=$FORK base=$BASE --description '<name>#<N>: <title>'`
  (`fork` only for a role that pushes: `deliver`, `design`, `fix-ci`,
  `rebase`, `adhoc`, `prototype`), and what the worker can't read from
  `manager.json`: `review` and `verify` (`deliver.review`, `deliver.verify`)
  for `deliver`, `fix-ci` and `adhoc`; `design` (`design.artifact`, or
  `none` when the design job is off), `design-name` and `design-path` for
  `design`, `deliver`, `adhoc` and `prototype`.
  The worker reads `repo` and `issue` from its tags (`worker` skill), and
  waits a little for them, then names the box for the issue and its title
  (`worker`, Name the box; `discobox tag` can't set a name). Then
  `scripts/status set <repo> <N> inProgress discobox:///<id>`. Tags are set
  only after launch; `discobox run` has no flag for them.
- **A launch that prints an error can still make a working box.** Seen with
  push rejections and decode errors. Before launching again, list the boxes
  you created and look for the new one. Two workers on one issue waste a slot
  and fight over the branch.

## Ad-hoc boxes

The owner never starts boxes; they ask you ("give me a box on api for
X"), and you start one they work in by hand. Only a box you created is one
you can read, type into and approve for later, so this is what lets the
owner's own work join the process.

```sh
scripts/launch submit --repo <repo> --job adhoc -p '<the owner's topic>'
```

Only with the `adhoc` job on (`scripts/launch` refuses otherwise): with it
off, tell the owner it's off and start nothing. There's no `adhoc` skill: it
launches with `submit`'s role (`github-deliver`), tagged `job=adhoc`, `fork`,
`base`, `review`, `verify` and the design tags. With no topic,
pass a short one of your own (`-p 'Ad-hoc box for the owner.'`): the script
needs a prompt.

Give the owner the box ID. On the table it is one row, Doing "owner
working", Your move `–`. Count it against `workers.max` like any worker.
Don't type into an ad-hoc box, and don't answer its prompts: the owner is
driving it. The only exception is "submit box X".

### Prototype boxes

When the owner says they want to prototype something ("prototype X on
api"), and the `prototype` job is on, start a box with the `prototype` skill:
`scripts/launch prototype --repo <repo> -p '/prototype <the idea, in a few words>'`
(role `github-deliver`, tagged `job=prototype`). When they want no main source but others to read from, use
`--no-source` with `-i OWNER/REPO` for each (`scripts/launch`; public
repositories only). The box knows it's prototyping: something working fast, no
tests, review or designs, and a `~/prototype.md` of decisions and shortcuts.
Treat it as an ad-hoc box in everything else: on the table Doing "owner
prototyping", and you don't type into it.

It ends one of two ways, and the owner says which. **Submit**: "submit box X",
below; the `submit` skill knows a prototype's code is never the PR as it
stands. **Drop**: the idea didn't hold, and the owner says so (or the box
ends on "nothing to submit"): retire the box, filing nothing.

### Pulling a box in (adoption)

A box the owner started on their own, not through you, joins by adoption:
the `adopt` skill (`/adopt <id or description>`). You find it, lead it,
write its issue, tag it, give it its role's credential and brief it. The box
itself runs no process step and asks for nothing.

### Taking over a PR

The owner (or a teammate) opened a PR by hand, and asks you to "take over
PR N" or "adopt PR N into our process". Only with the `deliver` job on (off:
a row saying so), only on their word, and only for a
trusted author: `author_association` `OWNER`, `MEMBER` or `COLLABORATOR`
(`gh api repos/<repo>/pulls/<N> --jq .author_association`). A community PR is
never taken over (`github`, Closing).

1. **Back-fill the issue(s).** Use the PR's own issue if it has one. Otherwise
   file it from the PR's body (`github`, Filing): Today / Wanted / Done when,
   the PR's description as the design, and what its author tested. One issue
   per independent change: a PR that fixes two things gets two issues. Give
   it the milestone the owner says, if any, and set it `ready`
   (`scripts/status set`). Leave the PR's own design decisions alone: a
   design in it that the owner wrote is their decision, and stays as written.
2. **Comment on the old PR**: `Taken over by the manager: tracked as #<issue>;
   a worker's PR will supersede this one.` Set its milestone to the issue's.
3. **Launch a `deliver-issue` worker** for the issue (the usual role and
   tags), with the prompt
   `/deliver-issue <issue>` and the line
   `Take over PR #<old>: deliver-issue §0b.`
4. **When the worker's PR is open**, close the old PR: comment `Superseded by
   #<new>, which carries these commits through review and verify.`, then
   `gh api -X PATCH repos/<repo>/issues/<old> -f state=closed` (a PR is an
   issue to this API; the `pulls` endpoint is refused). Don't wait for the
   merge: `Closes #<old>` in a PR body doesn't close a PR (GitHub's closing
   keywords close only issues), and two open PRs for one change split the
   review. If the takeover is abandoned, reopen it the same way
   (`state=open`).
5. On the table, the old PR's row goes; the issue's row follows the worker
   as usual.

### "Submit box X"

The owner says it to you, or types "submit" in the box themselves. When it's
you:

1. Read the bottom of its live screen. Wait until it is idle at its prompt
   with no dialog open; never type over the owner mid-turn.
2. Type `/submit`, then Enter. The box runs the `submit` skill.
3. It may ask the owner questions on the way, tagging itself `needs-input`:
   that's "Answer in the box" on the table. Don't answer them yourself.
4. It ends with a fixed comment on the issue (`submit` §5). Read its
   **Outcome** and act by `docs/gates.md`. The box has set its own
   `issue=<N>` tag; set `job=deliver` for *carry-on*. For
   *waiting-on-design*, keep the box: once the owner accepts the design (its
   PR merges, or they say so), set `job=deliver` and type "The design for
   #<N> is accepted; carry on as deliver-issue for #<N>" into it. Either
   needs the `deliver` job on; with it off, the box stops there and its
   issue is a row for the owner.

## Read a worker's state

- `discobox admin box ls -o json`: the runtime state, and the primary
  terminal's title. Claude Code leads the title with `✳` when idle.
- `discobox admin terminal screen <id> primary`: the live screen. **Judge only
  by the bottom of the live screen** (about 15 lines), never by scrollback. An
  old dialog in scrollback was once reported as a pending question long after
  the worker had answered it and opened its PR.
- A screen still showing `esc to interrupt`, or a running background shell or
  monitor, means the worker is working, whatever the title says.

## A question without its tag

A worker asks the owner with `AskUserQuestion`, and tags itself
`needs-input` first (`worker` skill). When the bottom of a box's live screen
shows a question dialog and the box isn't tagged `needs-input`, put the tags
on yourself:

```sh
discobox tag <id> needs-input --rm ready --rm blocked
```

and `scripts/status set <repo> <N> needsInput '<topic>'`, the topic in a
few words, not the question (the note lands only in your status comment:
when `needsInput` maps to a label, comment the topic in one line too). It
goes on the table as "Answer in the box".
When the dialog is gone, drop the tag (`--rm needs-input`) and
`scripts/status set <repo> <N> inProgress`. The
same goes for an ad-hoc box with no issue: tag the box, and the table row
says it.

## Type into a worker

```sh
discobox send <id> '<text>' && discobox send-key <id> Enter
```

A message with newlines stays one message (it arrives as a paste). Never type
into a worker that has a question dialog open: it would answer the dialog.

## Mechanical prompts you answer yourself

- **Login expired:** type `continue`, then Enter. It isn't a real expiry.
- **First-run permission dialog** ("Make auto mode your default permission
  mode?"): the owner's answer is "No, keep bypass permissions". Press Down,
  then Enter.

## Credential requests

Workers get GitHub from their role at launch and usually don't ask for it.
Approve a request when it is appropriate for the box's job: what you would
have bound at launch, such as an adopted box asking for its job's role
(`adopt`). Anything wider (another repository, merge, labels, a draft token,
any other secret) goes on the table for the owner, with what it asked for
and why. To approve:

```sh
discobox secret request ls -o json            # .secretRequests[] with status pending
discobox secret request approve <id>
```

- Approve **without `--secret`**. With it, the CLI first reads the box's
  bindings (GET `/secret-bindings`), which a box's role refuses (`403 ... not
  in the sandbox role`), and never sends the approval. Without it, the
  approval goes straight through.
- `secret request get` and `ls` may fail to decode an approved request
  (`unexpected field "approvedAs"`). Read a pending request before approving.
  Afterwards, the box's own `discobox-access list` or the workers monitor
  tells you it landed.
- A role that keeps turning out too narrow is a change to its file in
  `roles/`, committed and pushed, not a habit of approving.

## Power

Workers sleep whenever they wait and power off when they're done (the
`worker` skill, Power). You do the parts they can't:

- **Pause a box waiting on the owner.** A box tagged `needs-input` or
  `blocked` whose primary terminal has been idle for `workers.pauseAfter`
  (the `workers` monitor reports busy/idle): `discobox stop <id>`. A question
  dialog stops the agent from sleeping itself. Note the time it went idle
  when the event comes, and while any such box is pending, keep the waiting
  `pop` no longer than the time left (`watch`). The row stays "Answer in the
  box": opening it starts it again. **Never an owner's box** (`job=prototype`
  or `adhoc`): the owner drives it and it waits on them by design, so a
  pause only makes them ask for it back.
- **A box you stopped that starts again is the owner:**
  you didn't start it, so they opened it to work in it. Leave it running and
  never stop it again while it's in use; stop it only once its screen has
  been still for `workers.pauseAfter` after the owner's last input.
- **Wake a sleeping worker when its work needs it**: a review or comment on
  its PR, a failing check on its head, Evidence missing (`github`, The
  process comment), a rebase it's due (Rebases, below). **Never for a merge or close**: retire it as it sleeps. `discobox start <id>`, wait until its
  terminal is idle at the prompt (`admin terminal screen`), then type one
  line saying why, e.g. `PR #452 has a new review; carry on (deliver-issue
  §6).`, then Enter.
- **A conflict or rebase nudge** says what to do and nothing about the PR's
  draft state: `PR N conflicts with <base> (PR M merged). Rebase, re-run
  checks, push.` Never write "keep it a draft": workers take it for the
  owner's order and ask for a credential to turn a ready PR back into a
  draft. If one asks for a credential anyway, deny the request
  (`discobox secret request deny ID`) and tell it none is needed.
- **A box stopped on an API error:** the monitor says `stopped
  on an error`, and its screen ends with `API Error: The response stopped
  arriving. The response above may be incomplete.` Type `continue`, then Enter
  (the dialog sometimes already holds `continue`: just Enter). Look at its
  screen again after 20 seconds; if the error repeats three times, put it on
  the table for the owner.
- **A box that woke on its own wake and sits idle at its prompt** (its
  harness was relaunched and didn't take a turn): type `You woke: read
  ~/.discobox/wake/.done/ and carry on.`, then Enter.
- **A worker you find idle with no state tag and nothing on screen** for
  `workers.pauseAfter`: it forgot to sleep. Type `Set your state tag and
  sleep (worker skill, Power).`
- **Capacity counts running workers:** power state `running` or `starting`
  only (`scripts/table slots`). Suspended, stopped and archived boxes never
  count against `workers.max`. Waking one of your workers for its
  own PR comes before starting new work; at `workers.max`, it takes the next
  free slot ahead of any launch.

`discobox tag` starts a stopped box to write the tag, so a box you tag while
it sleeps is awake afterwards: stop it again if it has nothing to do.

## Rebases

Only with the `rebase` job on. Off, a PR in the merge queue that conflicts
is a "Rebase PR N" row for the owner, and you wake nothing for it.

A PR that conflicts with its base needs a rebase only if it's about to be
merged. Rebasing every conflicting PR after each merge is a rebase storm:
each rebase reruns CI, and the next merge makes most of them conflict again.

- **The merge queue** is the PRs at "Review and merge" on the table, in its
  ranked order (`table`).
- **Every PR in the queue is kept rebased**, not just the top few: the
  owner merges in any order. When one is `dirty`, wake its worker at once: `PR #<P>
  conflicts with <base>; rebase it (deliver-issue §6).` A rebase wakes its
  own worker even with every slot full.
- **After every merge to a watched repository's base**, recheck
  `mergeable_state` of every PR in the queue for that repository (give
  GitHub a minute: `unknown` means not yet), so a conflict is fixed before
  the owner sees it.
- **One rebase per PR per base.** Don't ask again while it's rebasing or its
  CI is running, and don't ask again for a base it's already rebased onto.
  After a merge, give GitHub a minute to recompute `mergeable_state` before
  acting (`unknown` means not yet).
- **A PR not yet green** isn't in the queue: its worker is still on it, and
  rebases as part of its own work.
- A worker whose box is gone gets a new `rebase-pr` worker, under the same
  rules.

## Retire

When a worker's PR merges or closes, or its job needs nothing more, retire
it right away, without waking it to do anything: **archive it**,
`discobox rm <id>` (the sandbox role archives the boxes you created). No
tag first: writing a tag starts a
sleeping box. Archiving keeps its workspace for the retention period, so
`discobox admin box unarchive <id>` brings it back if needed; then it's
purged. A 404 means it's already gone.

Don't archive a box the owner is working in (its screen shows their
session, or they opened it): leave it and say so.

## Disk

**Trim caches first: they are usually the biggest use of disk.** `~/.cache`
is a partition shared by the boxes on this host, and a build cache there
(Go's `go-build`, for one) grows without bound: it can reach well over
100 GiB, and trimming entries untouched for a day frees most of it in
seconds. When disk nears `disk.minFreeGiB`, before anything else:

```sh
du -sh ~/.cache/* | sort -h | tail                 # find the big ones
find ~/.cache/go-build -type f -atime +1 -delete   # Go: entries unused for a day
```

If that frees little (a busy day rewrites the cache fast), trim harder:
`find ~/.cache/go-build -type f -amin +360 -delete` (unused for 6 hours).

It's a cache: a build that needs a removed entry rebuilds it, slower but
correct. Prefer a time-bounded trim to wiping it, and do it while no worker
is mid-build if you can. Other caches there (`golangci-lint`, `gopls`,
`pnpm`) can be trimmed the same way.

Then, if still short: a worker's own Docker build cache is not shared and can
grow tens of GiB. Have idle workers run `docker builder prune -a -f`, never
`docker image prune -a`. Have them stop any dev image watcher and keep to one
Docker build at a time.
