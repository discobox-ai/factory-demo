# State

The manager keeps no state that only it can read. A new session, or a new
manager, rebuilds the whole table from three places:

1. **GitHub.** Each open issue's status (`scripts/status get`: its mapped
   status label, else the manager's status comment; `docs/labels.md`), its
   linked PR, and that PR's checks and mergeable state.
2. **Box tags.** Each worker the manager created carries `repo`, `issue`,
   `job`, `base`, `fork`, for some jobs `review`, `verify`, `design`,
   `design-name`, `design-path`, then `pr`, and a state tag: `needs-input`,
   `blocked` or `ready`; a retired worker is archived (`discobox rm`) (the `worker` worker
   skill defines them). List them with `discobox ls -o json`, filtered on
   `createdBySandboxId` equal to the manager's own box ID.
3. **The event queue.** `discobox-monitor` events wait until popped, so
   nothing that happened while the manager's session was down is lost
   (`.agents/skills/watch`).

On the box, `~/.local/state/manager/table.json` (the table) is a cache:
`/start` rebuilds it.

Nothing that matters lives in a session: the owner can delete them all and
start again with `/start`. Anything else (a local list of watched PRs, a
"last seen" file) is a cache. Losing it must cost nothing but a rebuild.
