---
name: sample
description: Run the factory once, end to end, on a small sample repository it creates in the owner's account — a ready-made manager for it, a buggy one-page app, the owner's own words describing a bug, then an issue, a triage worker, ready, a delivery worker, and a PR with the fix and before/after screenshots. Use when the owner picks the sample run in setup, says "try it", "show me", "sample" or "demo", or manager.json says "sample": true.
---

# Sample run

The owner sees the whole loop once, on something that doesn't matter, before
committing any real repository to it. Everything here is the real process:
the same skills, workers, roles and gates as the factory for their own
repositories. Only the setup is ready-made (`sample/manager.json`): one
private repository, `triage` and `deliver` on and both in `auto`, the
repository's labels created for it, one worker at a time, `verify` on and
`review` off (it would make the run much longer).

The app is `sample/app`, **Tip Split**: a one-page bill splitter with a few
bugs planted in it. Its own `AGENTS.md` asks every PR for before and after
screenshots, and its `verify-recipes` skill says how to take them; workers
follow a repository's own conventions, so nothing in the worker skills is
special to the sample.

**Narrate.** Unlike the manager's usual quiet (`start` §8), a sample run
says one line in chat at each stage below as it happens, with the link or
the box (`discobox:///<id>`): the point is to watch it.

## 1. The discobox API

As `setup` §0: check it, and if it's missing, ask for it with
`discobox api-access request` under the Monitor tool. Go on meanwhile;
nothing before §5 needs it.

## 2. Where it goes

Read `git config user.name`, `user.email` and `/etc/discobox/sandbox.json`'s
`git`, then ask in one `AskUserQuestion`:

1. **Their GitHub login**: the sample repository is created in that
   account, and the manager and its workers act as it (no bot account for a
   sample).
2. **The repository's name**: `factory-sample` (recommended), or another.
   It's created private. One that already exists must be empty, or a sample
   from an earlier run (it's reused).

Then write the ready-made manager and commit it (`github` skill, Keeping this
repository):

```sh
scripts/sample config <login> <name> <email>
git add manager.json && git commit -m "Sample run: <login>/<name>"
```

`scripts/sample config` refuses to replace a real setup (`configured` true
and not a sample): then this isn't a first run. Ask the owner whether they
want a second box for the sample instead, and stop.

## 3. One approval

```sh
scripts/request
```

In the background, keeping its request ID. It asks for everything at once
(`roles/README.md`): to create the sample repository, its labels and its
first commit (`github-sample-seed`, `github-push`), the manager's own use of
it (`github-manager`), and the triage and delivery roles to hand its workers.
Say in one line what they're approving, and wait. A denial: say what it
stops, and stop.

## 4. Create it

```sh
eval "$(discobox-access env)"
scripts/sample seed
```

It creates the repository (private), its labels, and pushes the app as
`main`. Say so in one line, with the repository's URL.

## 5. Start the manager

Run the `start` skill, §0 to §7: it names the box, finds the access in
place, offers the side pane, starts watching the sample repository, and
builds the table. Then, instead of `start` §8's one line, go on here. The
Monitor stream (`watch`) is up from here on, and events are handled as
usual between the steps below.

## 6. The owner describes a bug

Serve the app from this checkout so they can try it, and tell them how to
open it (the `discobox` skill says how the owner reaches a port in this box):

```sh
cd sample/app && python3 -m http.server 8000
```

(As a service or in the background, so it outlives this turn.) Then, in a
few lines: what Tip Split does, that it has bugs in it, and that they should
**describe one in their own words**, the way they'd report it to a teammate.
Offer a couple of starting points without giving the cause away, for
example:

- "With 3 people on a $50 bill, the amount each person pays looks wrong."
- "The 20% tip button doesn't seem to add 20%."

Anything they write is fine, a feature request too. Wait for their message.

## 7. File it, and let it run

File their report as an issue in the sample repository (`github` skill,
Filing and editing issues): their message quoted as the report, then Today
(what they saw, nothing more: finding the cause is triage's), Wanted and
Done when. **Leave it `new`**: in a sample
run the owner's request goes through triage like any reported issue, unlike
a request in conversation in `triage-intake`, so they see triage happen.

Then it's the ordinary process, by `triage-intake`, `workers` and
`docs/gates.md`, without asking (both jobs are in `auto`). Narrate each:

1. **Filed**: the issue's URL.
2. **Triage started**: the worker's box. It reproduces the bug, writes a
   failing test and posts its verdict on the issue.
3. **Triaged**: the verdict's first line, the labels applied, and that it's
   `ready` (any priority is ready in the sample: `labels.autoReadyMax` is
   `P1`). A verdict that needs the owner (a product choice, more
   information) is their move, as usual: say what it asks.
4. **Delivery started**: the worker's box. It fixes it, tests it, takes the
   screenshots and opens a PR.
5. **The PR is green**: check its Evidence as `github` skill, The process
   comment, says, and also that it embeds the **before and after
   screenshots** the sample repository's `AGENTS.md` asks for, rendering
   (fetch one image URL: it answers 200 with an image). Missing or broken:
   send the worker back, as for any missing Evidence. Then it's `in review`.

## 8. Hand over

Tell the owner, in a few lines: the PR's URL, what it changed, that its
screenshots show the fix, and that merging is theirs (the manager never
merges). Then what they can do next:

- **Report another bug** in the sample: same as §6–§7.
- **Set it up for their own repositories**: run `setup` (it starts from the
  template's settings with `scripts/sample reset`, keeping their login).
  The sample repository stays in their account; they can delete it on
  GitHub whenever they like.
- **Keep the manager**: everything is committed in this box only (`setup`
  §10–§11).

The sample run's workers are retired as usual when their work is done
(`docs/gates.md`). The web server can stop once the owner has seen the app.
