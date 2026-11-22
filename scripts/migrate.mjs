// Minimal migration runner — reads drizzle/*.sql in journal order, applies
// each inside one transaction, tracks applied tags in __migrations.
import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DRIZZLE_DIR = join(__dirname, '..', 'drizzle')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const MAX_RETRIES = 30
const RETRY_DELAY_MS = 2000

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function connect(client) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await client.connect()
      return true
    } catch (e) {
      console.log(`  …db not ready (${i + 1}/${MAX_RETRIES}): ${e.message}`)
      await sleep(RETRY_DELAY_MS)
    }
  }
  return false
}

async function main() {
  const client = new pg.Client({ connectionString })
  if (!(await connect(client))) {
    console.error('Could not connect to Postgres after retries')
    process.exit(1)
  }

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__migrations" (
        "id" serial PRIMARY KEY,
        "tag" text NOT NULL UNIQUE,
        "applied_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    const { rows: applied } = await client.query('SELECT tag FROM __migrations')
    const appliedSet = new Set(applied.map((r) => r.tag))

    const journalPath = join(DRIZZLE_DIR, 'meta', '_journal.json')
    if (!existsSync(journalPath)) {
      console.error('No meta/_journal.json found')
      process.exit(1)
    }
    const journal = JSON.parse(await (await import('node:fs/promises')).readFile(journalPath, 'utf8'))
    const entries = (journal.entries || []).sort((a, b) => a.idx - b.idx)

    for (const entry of entries) {
      if (appliedSet.has(entry.tag)) {
        console.log(`✓ ${entry.tag} (already applied)`)
        continue
      }
      const sqlFile = join(DRIZZLE_DIR, `${entry.tag}.sql`)
      if (!existsSync(sqlFile)) {
        console.error(`✗ ${entry.tag}: file not found (${sqlFile})`)
        process.exit(1)
      }
      const { readFile } = await import('node:fs/promises')
      const sql = await readFile(sqlFile, 'utf8')
      const statements = sql.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean)
      try {
        await client.query('BEGIN')
        for (const stmt of statements) {
          await client.query(stmt)
        }
        await client.query('INSERT INTO __migrations(tag) VALUES ($1)', [entry.tag])
        await client.query('COMMIT')
        console.log(`✓ ${entry.tag} (applied)`)
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {})
        console.error(`✗ ${entry.tag}: ${e.message}`)
        process.exit(1)
      }
    }
    console.log('migrations complete')
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
