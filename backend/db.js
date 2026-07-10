import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseUrl = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'local.db')}`;

const client = createClient({
  url: databaseUrl,
});

let initialized = false;

async function initializeSchema() {
  if (initialized) return;

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  const statements = schema
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);

  for (const statement of statements) {
    try {
      await client.execute(statement);
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  initialized = true;
}

export default {
  client,
  initializeSchema,
};
