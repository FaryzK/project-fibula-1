const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const useDatabase =
  Boolean(connectionString) &&
  process.env.USE_MEMORY_STORE !== 'true' &&
  process.env.NODE_ENV !== 'test';

let pool = null;
let schemaReady = false;
let schemaPromise = null;

function isDatabaseEnabled() {
  return useDatabase;
}

function getPool() {
  if (!useDatabase) {
    throw new Error('Database is not configured');
  }

  if (!pool) {
    const ssl = process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false };
    pool = new Pool({ connectionString, ssl });
  }

  return pool;
}

async function query(text, params) {
  const db = getPool();
  return db.query(text, params);
}

async function ensureSchema() {
  if (!useDatabase || schemaReady) {
    return;
  }

  if (!schemaPromise) {
    schemaPromise = (async () => {
      const db = getPool();

      const statements = [
        `CREATE TABLE IF NOT EXISTS workflows (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS splitting_prompts (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS categorisation_prompts (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS document_folders (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS extractors (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS data_map_sets (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS data_map_rules (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS reconciliation_rules (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS matching_sets (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          rule_id text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL,
          updated_at timestamptz NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS workflows_user_created_idx ON workflows (user_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS splitting_prompts_user_created_idx ON splitting_prompts (user_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS categorisation_prompts_user_created_idx ON categorisation_prompts (user_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS document_folders_user_created_idx ON document_folders (user_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS extractors_user_created_idx ON extractors (user_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS data_map_sets_user_created_idx ON data_map_sets (user_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS data_map_rules_user_created_idx ON data_map_rules (user_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS reconciliation_rules_user_created_idx ON reconciliation_rules (user_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS matching_sets_user_rule_idx ON matching_sets (user_id, rule_id, created_at)`
      ];

      for (const statement of statements) {
        await db.query(statement);
      }
    })();
  }

  await schemaPromise;
  schemaReady = true;
}

module.exports = {
  ensureSchema,
  isDatabaseEnabled,
  query
};
