export const OBSERVATION_NOTE_LIMIT=300
export function validObservationNote(value:unknown):value is string|undefined{return value===undefined||(typeof value==='string'&&value.length<=OBSERVATION_NOTE_LIMIT)}
export function normalizeObservationNote(value=''):string|undefined{const note=value.trim();if(!validObservationNote(note))throw Error('备注最多 300 字');return note||undefined}
