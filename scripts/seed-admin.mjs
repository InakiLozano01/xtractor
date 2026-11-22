// Idempotent admin seeder — runs at boot. Driven by ADMIN_EMAIL/ADMIN_PASSWORD.
// If the admin exists, ensures role='admin'. If not, creates it.
import pg from 'pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD

if (!connectionString) {
  console.error('seed-admin: DATABASE_URL not set — skipping')
  process.exit(0)
}
if (!email || !password) {
  console.error('seed-admin: ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping')
  process.exit(0)
}

const client = new pg.Client({ connectionString })
try {
  await client.connect()
  const { rows } = await client.query('SELECT id FROM users WHERE email = $1', [email])
  const hash = await bcrypt.hash(password, 12)
  if (rows.length === 0) {
    await client.query(
      'INSERT INTO users(email, password_hash, name, role, email_verified_at) VALUES ($1, $2, $3, $4, now())',
      [email, hash, 'Admin', 'admin']
    )
    console.log(`seed-admin: created admin ${email}`)
  } else {
    await client.query(
      "UPDATE users SET role = 'admin', email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE email = $1",
      [email]
    )
    console.log(`seed-admin: ensured admin role for ${email}`)
  }
} catch (e) {
  console.error('seed-admin error:', e.message)
  process.exit(1)
} finally {
  await client.end()
}
