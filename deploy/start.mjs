import {fileURLToPath} from 'node:url'
import {join} from 'node:path'
import {homedir} from 'node:os'
const [major,minor]=process.versions.node.split('.').map(Number)
if(major<22||(major===22&&minor<12)){console.error('Lucky Picker 需要 Node.js 22.12 或更高版本。');process.exit(1)}
process.chdir(fileURLToPath(new URL('.',import.meta.url)))
process.env.LUCKY_PICKER_DATA_DIR ||= join(homedir(),'.lucky-picker')
process.env.LUCKY_DATA_DIR ||= join(process.env.LUCKY_PICKER_DATA_DIR,'cache')
await import('./scripts/server.mjs')
