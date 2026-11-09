# Gates: what the manager does alone, and what goes to the owner

The manager acts alone on everything mechanical and reversible. Anything that
sets direction, trust or what ships goes to the owner, as a row on the table.

**Ask first** (`AGENTS.md`): "does alone" below applies only to jobs in
`manager.json` `auto`. For every other job, each action in that column is a
proposal to the owner first, and is done once they say yes. An event that
belongs to no job (closing an issue whose PR merged, applying a submit
comment) follows the job that started the work.

Statuses below are concepts: move one with `scripts/status set`, read one
with `scripts/status get` (`docs/labels.md`). A job named in brackets runs
only when it's on (`scripts/config jobs`); **with it off, the event becomes a row
for the owner** saying what happened and what's needed, and the manager
starts nothing.

| Event | The manager does alone | Goes to the owner |
|---|---|---|
| The owner asks for a box to work in [adhoc] | Starts an ad-hoc box (`workers`, Ad-hoc boxes), within capacity | – |
| The owner wants to prototype something [prototype] | Starts a prototype box (`workers`, Prototype boxes), within capacity | – |
| A prototype is dropped | Retires the box, files nothing | – |
| The owner says "take over PR N" (a trusted author's PR) [deliver] | Back-fills its issue, comments on the PR, launches a `deliver-issue` worker to carry its commits on, and closes the old PR once the new one is open (`workers`, Taking over a PR) | Merging the new PR |
| The owner says "submit box X" | Types `/submit` into it once it's idle | Its questions, answered in the box |
| A submit comment lands on an issue (`submit` §5) | Applies its proposed labels and a status: *carry-on* → `inProgress`, the box becomes its worker; *waiting-on-design* → `blocked`, the box is kept (powered off) and woken to carry on as `deliver-issue` once the owner accepts the design; *parked* → `ready` (or `blocked` on a design), and the box is retired; *design-only* → `ready`, the box is retired. The owner's own work skips triage and the priority gate | Accepting or rejecting its design |
| A community PR (author not an owner, member or collaborator) with no issue | Never merged, never checked out or run, its CI never approved. Asks the owner whether to back-populate an issue from it. Yes: reads only its description, files the issue from that (not from its code), and closes the PR pointing to the issue. No, or no answer: comments that every PR must be linked to an issue, and closes it (`github` skill, Closing) | Whether the change it proposes is worth an issue |
| A community PR that names an issue | Never merged; nothing is read from it until the issue's own PR is done. The issue goes through the process as usual. If the issue is rejected (closed not planned), closes the PR too, with a comment saying why | – |
| Our PR opens for an issue a community PR also names | Comments on the community PR naming ours as its replacement, and closes it | – |
| A maintainer's PR with no issue | – | A "needs an issue" row. Don't file one for someone else's PR |
| New issue (status `new`) [triage] | Starts a triage worker (`triage-issue`), at most `workers.triageMax` at once: a reported flake first, then the focus milestone's, then highest priority, then newest. An issue titled `Flaky: ` skips triage: the `flake` label if mapped, `ready` | – |
| New issue, triage off | A row for it | Marking it `ready` (a label, or saying so in chat) |
| An issue is `inProgress` but no box of yours holds it | Starts no worker for it: someone else has it. A row "worker not mine" | Only if it stays that way with nothing moving |
| Triage verdict | Applies the labels it proposes. A flake goes straight to `ready`. Anything else at `autoReadyMax` or below goes straight to `ready` | A choice of product direction (whether to do it at all, or which way), and anything above `autoReadyMax` (or everything, when it's `null`), become `needsDecision` |
| Triage verdict: needs information from the reporter | Sets `triaged`, with a row saying what was asked; triages again when the reporter answers | – |
| Triage verdict: duplicate, or already fixed | – | Closing it (the verdict names the duplicate or the fix) |
| `ready` and a free slot [deliver] | Takes the next up (`docs/labels.md`, Next up). Starts `propose-design` when [design] is on, the design is non-obvious, and no accepted design covers it; else `deliver-issue`. `scripts/launch` sets `inProgress` | – |
| `ready`, deliver off | Keeps its row ranked | The work itself |
| A design is ready (its PR green, or its issue comment posted) | – | Accepting it (merging its PR, or saying so) or rejecting it with a comment |
| A design is accepted | Retires its `propose-design` worker. Sets the issue `ready` and, with a free slot, starts a `deliver-issue` worker, which implements it (and, for a file, marks it accepted in the repository's own way) | – |
| An implementation PR is green | Reads its Evidence against the PR and the issue (`github` skill, The process comment). Something missing or not matching: sends the worker back to do it. Otherwise posts the process comment and sets `inReview` | Review and merge, after the comment |
| A PR conflicts with its base [rebase] | If it's at "Review and merge" (or green and on its way there): wakes its worker to rebase at once, whatever its rank (`workers`, Rebases) | – (rebase off: "Rebase PR N") |
| A PR's CI fails and its worker is stopped [fix-ci] | Starts the worker again on `fix-ci` | "Look at it" if the worker says it can't make it green |
| The base branch's CI fails [fix-ci] | If it looks like a flake (unrelated to the commit), files a flake issue (`ready`). Otherwise files an issue and starts a `fix-ci` worker | – |
| A PR merges | Closes its issue if it's still open, and retires its worker: archived with `discobox rm`, never woken to do anything | – |
| A worker asks for a credential | Approves it when it's what its launch would have bound (an adopted box asking for its job's role, `adopt`) | Anything wider: another repository, merge, labels, any other secret |
| The owner asks to adopt a box | Adopts it, writes its issue, tags it, gives it its role, briefs it (`adopt`) | Approving the adoption in the console |
| A worker stops on a question | Makes sure the box is tagged `needs-input` and its issue is `needsInput` (`workers`, A question without its tag) | "Answer in the box"; the owner answers in the box |
| A worker shows a mechanical prompt (login expired, the first-run permission dialog) | Answers it (`workers`) | – |
| Disk below `disk.minFreeGiB` | Starts no workers; has idle workers free their build caches | Only if it can't recover |
| A worker waiting on the owner, its screen still for `workers.pauseAfter` | Stops it (`workers`, Power) | "Answer in the box"; opening it starts it |
| An event for a sleeping worker's PR or design (review, comment, failing check, a rebase it's due) | Starts it and types one line saying why. Not for a merge | – |
| A finished worker | Archives it (`discobox rm`) | – |
| The first worker reaches its end state, `onboarding` true | Finishes what follows it, then asks the owner once how it went: let that job run on its own (`auto`), set up another job, or keep asking; with `self` empty, reminds them how to keep the manager. Sets `onboarding` false | The choice |
| The owner changes the process | Edits this repository (AGENTS.md, a skill, `docs/`, `manager.json`), commits it (and pushes it, with `self` set), and when repositories or jobs changed, sends `scripts/request` again | Approving a new access request |

Rank table rows by how much each unblocks downstream (critical path first), then
by how hard the decision is to reverse (trust roots and stored credentials rank
high).
