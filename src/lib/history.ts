export interface HistoryEntry { id: string; createdAt: string; label: string; lines: string[] }
export const HISTORY_KEY='lucky-picker:history:v1'
function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false
  const e=value as Partial<HistoryEntry>
  return typeof e.id==='string' && typeof e.createdAt==='string' && Number.isFinite(Date.parse(e.createdAt)) && typeof e.label==='string' && Array.isArray(e.lines) && e.lines.length>0 && e.lines.every(line=>typeof line==='string')
}
export function readHistory(storage:Pick<Storage,'getItem'>=localStorage): HistoryEntry[] {
  try {
    const parsed:unknown=JSON.parse(storage.getItem(HISTORY_KEY)??'[]')
    return Array.isArray(parsed) && parsed.every(isEntry) ? parsed.slice(0,50) : []
  } catch { return [] }
}
export function saveHistory(entries: HistoryEntry[],storage:Pick<Storage,'setItem'>=localStorage): boolean {
  try { storage.setItem(HISTORY_KEY,JSON.stringify(entries.slice(0,50))); return true }
  catch { return false }
}
