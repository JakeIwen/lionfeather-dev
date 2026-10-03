import { fileURLToPath } from 'node:url'
import { checkResume, publicResume } from './resume-source.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const master = checkResume(root)
console.log(
  `Resume check passed: ${publicResume} matches the ${master.version} public master (sha256 ${master.hash.slice(0, 12)}…).`,
)
