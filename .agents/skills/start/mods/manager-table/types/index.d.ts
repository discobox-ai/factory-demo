export type TableRow = {
  item: string
  agent: string
  issue: string
  pr: string
  doing: string
  yourMove: string
  why: string
}

export type Slots = { max: number; boxes: { id: string; label: string }[] }

export type Table = { rows: TableRow[]; links: string[]; postedAt: number; slots?: Slots; repos?: Record<string, string> }

declare module 'claude-code' {
  interface PluginState {
    'manager-table': { table: Shaped<Table> }
  }
}
