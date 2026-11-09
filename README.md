# Manager starter template

An agent that runs engineering work across your GitHub repositories. It lives
in one long-running discobox, watches your repositories, triages what comes
in, starts a **worker discobox** per job (triage, design, deliver, fix CI,
rebase — whichever you turn on) and brings you only what needs you: a
decision, a question in a box, a green PR to merge. You merge; it never does.

It fits how your repositories already work: it adopts the labels you have
(and creates none), writes designs the way your team does (an ADR, an RFC, a
comment on the issue, or not at all), and runs only the jobs you ask it to.

This is a starter, not a framework. Start it from here; on its first run it
makes itself a repository of your own (a new private repository, or a fork)
and from then on it's yours: when you change how you want it to work, tell
it, and it edits its own skills there and pushes them. There is no upstream
to pull from.

## What's here

- `AGENTS.md` (also `CLAUDE.md`): the manager itself.
- `manager.json`: your settings, written by `/setup` (`docs/config.md`).
- `.agents/skills/`: the manager's skills (`setup`, `start`,
  `watch`, `workers`, `table`, `github`, `triage-intake`, `adopt`).
- `worker-skills/`: what each worker gets, one skill per job.
- `roles/`: the GitHub credential policy each kind of box is bound
  (`roles/README.md`). No role can merge.
- `scripts/`: `config`, `status`, `request`, `launch`, `table`.
- `docs/`: gates (what it does alone, what comes to you), labels, state.

## Start it

1. Start the manager's box from this repository:

   ```sh
   discobox run -d --discobox-api --no-project-skills \
     https://github.com/discobox-ai/factory@main -p '/setup'
   ```

   `/setup` first asks where the manager's own repository should live, and
   creates it (or forks this one, or uses one you made). Already forked it?
   Start from your fork instead; `/setup` uses it as is. Either way, start
   from your repository next time.

   `--discobox-api` lets it create, steer and tag its workers (only boxes it
   creates). Forgot it? `/setup` notices, and asks you to run
   `discobox admin box update <box> --discobox-api`. `--no-project-skills` keeps other skill repositories in your
   project from loading beside its own.
2. Open the box. `/setup` asks which repositories it runs, which GitHub
   account it acts as (a bot account is best), which jobs you want it to
   manage (each one separately), how your team writes designs, and how your
   existing labels map onto its statuses (a status with no label is kept in a
   comment on the issue instead), what it may do without asking you, and how
   many workers it may run. Then it asks you to approve its GitHub access
   once, and starts.

After that, talk to it in that box. Its status table is a side pane (Claude
Code asks once to "Turn on" the mod that draws it). To start over in a new
session, type `/start`: everything it needs is in GitHub, its workers' tags
and `manager.json`.
