import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'manager-table',
  component: 'Pane',
  requestId: 'manager-table',
  props: {
    title: 'Manager table',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

const TABLE = {
  postedAt: Date.now(),
  rows: [
    { item: 'api needs a decision', agent: 'sbx_abc', issue: '-', pr: '-', doing: 'Waiting for you', yourMove: 'Answer in the box', why: 'x' },
    { item: 'Deliver 454', agent: 'sbx_def', issue: '454', pr: '-', doing: 'Working', yourMove: '–', why: 'y' },
  ],
  links: [],
  repos: { '': 'acme/web', web: 'acme/web', api: 'acme/api' },
}

test('the table file draws on the terminal and the desktop', async ($, on) => {
  on('command.register', () => ({ value: { command: 'table-pane' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('env.get', () => ({ value: '/home/t' }))
  on('fs.stat', () => ({ value: { kind: 'file', size: 1, mtimeMs: 1, isLink: false } }))
  on('fs.read', (_, e) => {
    expect(e.path).toBe('/home/t/.local/state/manager/table.json')
    return { value: JSON.stringify(TABLE) }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /api needs a decision/ }))?.text).toContain('1. api needs a decision')
    expect((await ui.find({ type: 'Text', text: /Answer in the box/ }))?.text).toContain('Answer in the box')
    expect((await ui.find({ type: 'Text', text: /box sbx_def/ }))?.text).toBe('box sbx_def')
    const issue = await ui.find({ type: 'Link', label: 'issue 454' })
    expect(issue?.props?.href ?? issue?.href).toBe('https://github.com/acme/web/issues/454')
    expect(await ui.find({ type: 'Link' })).toBeDefined()
    await ui.unmount()
  }
})
