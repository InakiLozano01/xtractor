import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { nodeFileTrace } = require('next/dist/compiled/@vercel/nft')
const root = process.cwd()
const destination = path.join(root, '.next/standalone')
const entrypoints = process.argv.slice(2)
if (entrypoints.length === 0) throw new Error('Provide runtime CLI entrypoints')
const { fileList, warnings } = await nodeFileTrace(entrypoints, { base: root, processCwd: root })
for (const file of fileList) {
  const source = path.resolve(root, file)
  if (!source.startsWith(root + path.sep)) throw new Error(`Runtime trace escaped project: ${file}`)
  const target = path.join(destination, file)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const stat = fs.lstatSync(source)
  if (stat.isSymbolicLink()) {
    const link = fs.readlinkSync(source)
    let existing
    try { existing = fs.lstatSync(target) } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (existing) {
      if (!existing.isSymbolicLink() || fs.readlinkSync(target) !== link) throw new Error(`Conflicting runtime symlink: ${file}`)
    } else fs.symlinkSync(link, target)
  } else if (stat.isDirectory()) fs.mkdirSync(target, { recursive: true })
  else fs.copyFileSync(source, target)
}
console.log(JSON.stringify({ runtimeCliEntrypoints: entrypoints, tracedFiles: fileList.size, warnings: [...warnings].map(error => error.message) }))
