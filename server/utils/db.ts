import { neon } from '@neondatabase/serverless'

let _sql: ReturnType<typeof neon> | null = null

export function useDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL not set')
    _sql = neon(url)
  }
  return _sql
}

export function resetDb() {
  _sql = null
}
