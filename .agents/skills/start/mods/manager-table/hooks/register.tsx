import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Table, TableRow } from '../types'

// The manager writes its table here whenever a row changes (the `table`
// skill); this mod only reads it. Relative to $HOME.
const FILE = '.local/state/manager/table.json'
const PANE = 'manager-table'
const EVERY_MS = 5000
const STALE_MS = 15 * 60 * 1000

const table = atom({ plugin: 'manager-table', key: 'table' } as const, { rows: [], links: [], postedAt: 0 } as Table, {
  shape: 'table-2',
})

const NONE = new Set(['', '-', '–', '—'])
const isMove = (row: TableRow) => !NONE.has(String(row.yourMove ?? '').trim())
const dash = (s: unknown) => (NONE.has(String(s ?? '').trim()) ? '' : String(s))

function refsOf(row: TableRow): string {
  return [dash(row.issue) && `issue ${row.issue}`, dash(row.pr) && `PR ${row.pr}`, dash(row.agent) && `box ${row.agent}`]
    .filter(Boolean)
    .join(' · ')
}

// "454" is the first watched repository's; "api 33" names another by its
// short name. The table file carries the map (scripts/table writes `repos`
// from manager.json: "" and each short name to owner/name).
let REPOS: Record<string, string> = {}
function ghUrl(ref: string, kind: 'issues' | 'pull'): string | undefined {
  const m = ref.trim().match(/^(?:[\w.-]+\/)?(?:([a-z][\w.-]*?)\s*#?\s*)?#?(\d+)$/i)
  if (m === null) return undefined
  const full = REPOS[(m[1] ?? '').toLowerCase()]
  if (full === undefined) return undefined
  return `https://github.com/${full}/${kind}/${m[2]}`
}

// A reference as a link to GitHub, or plain text when it isn't a number.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ghLink(ref: string, kind: 'issues' | 'pull', word: string, el: { Text: any; Link: any }) {
  const { Text, Link } = el
  const v = dash(ref)
  if (v === '') return null
  const url = ghUrl(v, kind)
  if (url === undefined) return <Text dimColor>{`${word} ${v}`}</Text>
  return <Link href={url} label={`${word} ${v}`} />
}

// A box opens in the discobox console by its URI on the reader's own server
// (discobox:///<id>).
const boxUrl = (id: string) => `discobox:///${id}`

// Every box ID in a field ("sbx_a, sbx_b"), each a link.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function boxLinks(field: string, el: { Text: any; Link: any; Box: any }) {
  const { Text, Link, Box } = el
  const ids = String(field).match(/sbx_[a-z0-9]+/g) ?? []
  if (ids.length === 0) return <Text dimColor>box {field}</Text>
  const parts = [<Text dimColor>box </Text>]
  ids.forEach((id, i) => {
    if (i > 0) parts.push(<Text dimColor>, </Text>)
    parts.push(<Link href={boxUrl(id)} label={id} />)
  })
  return <Box flexDirection="row">{parts}</Box>
}

// Where a move takes place: a box, a PR, or the issue.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function where(row: TableRow, el: { Text: any; Link: any; Box: any }) {
  const box = String(row.yourMove).match(/sbx_[a-z0-9]+/)?.[0] ?? (/\bbox\b/i.test(row.yourMove) ? dash(row.agent) : '')
  if (box) return boxLinks(box, el)
  // "Merge api PR 8": the repository named before "PR" wins;
  // then the PR field's, then the issue field's ("api 46", "api#7").
  const named = String(row.yourMove).match(/\b([a-z][\w.-]*)\s+PR\s+#?(\d+)/i)
  const num = named?.[2] ?? String(row.yourMove).match(/\bPR\s+#?(\d+)/i)?.[1] ?? dash(row.pr).match(/(\d+)$/)?.[1]
  if (num && !/\bissue\b/i.test(row.yourMove)) {
    const fieldRepo = (f: string) => dash(f).match(/^(?:[\w.-]+\/)?([a-z][\w.-]*?)\s*#?\s*\d+$/i)?.[1]
    // Only a repository the manager watches counts: "ADR PR 710" or "the PR 9" name none.
    const said = named && named[1].toLowerCase() in REPOS ? named[1].toLowerCase() : undefined
    const repo = said ?? fieldRepo(row.pr) ?? fieldRepo(row.issue)
    return ghLink(repo ? `${repo} ${num}` : num, 'pull', 'PR', el)
  }
  return ghLink(row.issue, 'issues', 'issue', el)
}

function ago(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  return `${Math.round(min / 60)} h ago`
}

// Reads the file when its mtime moved; a missing or half-written file leaves
// the last good table in place.
let seenMtime = -1
async function poll($: EngineInterface, path: string): Promise<void> {
  let mtime: number
  try {
    mtime = (await $.fs.stat(path)).mtimeMs
  } catch {
    return
  }
  if (mtime === seenMtime) return
  let parsed: Partial<Table>
  try {
    parsed = JSON.parse(await $.fs.read(path)) as Partial<Table>
  } catch {
    return
  }
  seenMtime = mtime
  if (parsed.repos && typeof parsed.repos === 'object') REPOS = parsed.repos
  const next: Table = {
    rows: Array.isArray(parsed.rows) ? parsed.rows : [],
    links: Array.isArray(parsed.links) ? parsed.links : [],
    postedAt: typeof parsed.postedAt === 'number' ? parsed.postedAt : mtime,
    ...(parsed.slots && Array.isArray(parsed.slots.boxes) ? { slots: parsed.slots } : {}),
  }
  await update($, table, () => next)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const home = (await $.env.get('HOME')) ?? '/root'
    const path = `${home}/${FILE}`
    await $.command.register({ name: 'table-pane', description: "Show the manager's status table in a pane" })
    $.ui.status(undefined)
    await poll($, path)
    $.clock.every(EVERY_MS, () => poll($, path))
    void $.ui.open({ id: PANE, title: 'Manager table' })
    return next(e)
  })

  // Says where the pane can show: the surfaces attached now, and whether the
  // engine placed the pane (and why not).
  on('command.run', { command: 'table-pane' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'Manager table' })
    const surfaces = await $.session.surfaces()
    const placed = opened.isPlaced ? 'placed' : `not placed: ${opened.reason}`
    return { text: `Manager table pane ${placed}. Attached surfaces: ${surfaces.join(', ') || 'none'}.` }
  })

  // A surface that joins later (desktop, web, phone) gets the pane too.
  on('session.attach', async ($, e, next) => {
    const r = await next(e)
    const opened = await $.ui.open({ id: PANE, title: 'Manager table' })
    $.ui.log(`manager-table: ${e.surface} attached; pane ${opened.isPlaced ? 'placed' : `not placed: ${opened.reason}`}`)
    return r
  })

  // Your top three moves, drawn by the mod above the prompt, each with a link
  // to where the move happens: the box for an answer in a box, the PR for a
  // review or merge, else the issue.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const t = await read($, table)
    const moves = t.rows.filter(isMove)
    if (moves.length === 0) return next(e)
    const { Box, Text, Link } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {moves.slice(0, 3).map((row, i) => (
          <Box flexDirection="row" flexWrap="wrap">
            <Text dimColor>{i + 1}. </Text>
            <Text>{row.yourMove}</Text>
            <Text dimColor> — {row.item} </Text>
            {where(row, { Text, Link, Box })}
          </Box>
        ))}
        {moves.length > 3 && <Text dimColor>   +{moves.length - 3} more in the pane</Text>}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Link } = $.ui.resolve(e)
    const t = await read($, table)
    if (t.rows.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No table yet (~/{FILE}).</Text>
        </Box>
      )
    }
    const age = Date.now() - t.postedAt
    const when = new Date(t.postedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return (
      <Box flexDirection="column">
        <Text dimColor={age < STALE_MS} color={age >= STALE_MS ? 'red' : undefined}>
          {age >= STALE_MS ? 'Stale · ' : ''}Updated {when} ({ago(age)}) · {t.rows.filter(isMove).length} need you
        </Text>
        {t.slots !== undefined && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>
              {t.slots.boxes.length}/{t.slots.max} running
            </Text>
            {t.slots.boxes.map(b => (
              <Text>
                {'  '}
                {b.label} <Link href={boxUrl(b.id)} label={b.id} />
              </Text>
            ))}
          </Box>
        )}
        {t.rows.map((row, i) => {
          const refs = refsOf(row)
          return (
            <Box flexDirection="column" marginTop={1}>
              <Text bold>
                {i + 1}. {row.item}
              </Text>
              {isMove(row) && <Text color="yellow">  → {row.yourMove}</Text>}
              <Text>  {row.doing}</Text>
              {refs !== '' && (
                <Box flexDirection="row" flexWrap="wrap">
                  <Text dimColor>  </Text>
                  {ghLink(row.issue, 'issues', 'issue', { Text, Link })}
                  {dash(row.issue) && (dash(row.pr) || dash(row.agent)) && <Text dimColor> · </Text>}
                  {ghLink(row.pr, 'pull', 'PR', { Text, Link })}
                  {dash(row.pr) && dash(row.agent) && <Text dimColor> · </Text>}
                  {dash(row.agent) && boxLinks(row.agent, { Text, Link, Box })}
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    )
  })
}
