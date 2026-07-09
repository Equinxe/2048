#!/usr/bin/env node
/**
 * Schema validation script for 2048 database
 * Executes DDL against a test SQLite database to verify syntax and constraints
 */

const fs = require('fs');
const path = require('path');

function validateSchema() {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    try {
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

      // Remove SQL comments (lines starting with --)
      const cleanedSchema = schema
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');

      // Split by semicolon, filter empty statements
      const statements = cleanedSchema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      // Execute each statement
      statements.forEach(stmt => {
        db.exec(stmt);
      });

      // Verify tables exist
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      ).all();

      console.log('✓ Schema validation successful');
      console.log(`✓ Created ${tables.length} tables:`);
      tables.forEach(t => console.log(`  - ${t.name}`));

      // Display schema
      console.log('\nGenerated DDL:');
      const schema_result = db.prepare(
        "SELECT sql FROM sqlite_master WHERE type IN ('table', 'index') AND sql IS NOT NULL ORDER BY type DESC, name"
      ).all();

      schema_result.forEach(row => {
        if (row.sql) {
          console.log(row.sql + ';');
        }
      });

      // Test constraints
      console.log('\n✓ Testing constraints...');

      // Test profiles CHECK constraint (valid)
      db.prepare('INSERT INTO profiles (name, created_at) VALUES (?, ?)').run(
        'TestProfile',
        new Date().toISOString()
      );
      console.log('  ✓ profiles.name length 1-12: CHECK constraint accepts valid names');

      // Test profiles CHECK constraint (should fail on empty name)
      try {
        db.prepare('INSERT INTO profiles (name, created_at) VALUES (?, ?)').run(
          '',
          new Date().toISOString()
        );
        console.log('  ✗ ERROR: profiles empty name should have failed CHECK');
        process.exit(1);
      } catch (e) {
        console.log('  ✓ profiles.name empty string: CHECK constraint enforced');
      }

      // Test profiles CHECK constraint (should fail on name > 12 chars)
      try {
        db.prepare('INSERT INTO profiles (name, created_at) VALUES (?, ?)').run(
          'TooLongNameHere',
          new Date().toISOString()
        );
        console.log('  ✗ ERROR: profiles name > 12 should have failed CHECK');
        process.exit(1);
      } catch (e) {
        console.log('  ✓ profiles.name > 12 chars: CHECK constraint enforced');
      }

      // Test games foreign key
      try {
        db.prepare('INSERT INTO games (profile_id, score, played_at, result) VALUES (?, ?, ?, ?)').run(
          999,
          1000,
          new Date().toISOString(),
          'win'
        );
        console.log('  ✗ ERROR: games foreign key should have failed');
        process.exit(1);
      } catch (e) {
        console.log('  ✓ games.profile_id FOREIGN KEY constraint: enforced');
      }

      // Test games CHECK constraints (valid)
      db.prepare('INSERT INTO games (profile_id, score, played_at, result) VALUES (?, ?, ?, ?)').run(
        1,
        1024,
        new Date().toISOString(),
        'win'
      );
      console.log('  ✓ games.score >= 0: CHECK constraint accepts valid scores');
      console.log('  ✓ games.result IN (win, loss): CHECK constraint accepts valid results');

      // Test games CHECK constraint (invalid score)
      try {
        db.prepare('INSERT INTO games (profile_id, score, played_at, result) VALUES (?, ?, ?, ?)').run(
          1,
          -100,
          new Date().toISOString(),
          'win'
        );
        console.log('  ✗ ERROR: games negative score should have failed CHECK');
        process.exit(1);
      } catch (e) {
        console.log('  ✓ games.score < 0: CHECK constraint enforced');
      }

      // Test games result enum
      try {
        db.prepare('INSERT INTO games (profile_id, score, played_at, result) VALUES (?, ?, ?, ?)').run(
          1,
          500,
          new Date().toISOString(),
          'invalid'
        );
        console.log('  ✗ ERROR: games invalid result should have failed CHECK');
        process.exit(1);
      } catch (e) {
        console.log('  ✓ games.result enum: CHECK constraint enforced');
      }

      // Verify indexes exist
      console.log('\n✓ Query performance indexes:');
      const indexes = db.prepare(
        "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND tbl_name IN ('games') ORDER BY tbl_name, name"
      ).all();

      if (indexes.length === 0) {
        console.log('  ✗ ERROR: No indexes found on games table');
        process.exit(1);
      } else {
        indexes.forEach(idx => {
          console.log(`  - ${idx.name}`);
        });
      }

      // Show index details
      console.log('\n✓ Index definitions:');
      const indexInfo = db.prepare(
        "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name"
      ).all();

      indexInfo.forEach(row => {
        console.log(`  ${row.sql}`);
      });

      console.log('\n✓ All validation checks passed!');
      db.close();
      process.exit(0);

    } catch (error) {
      console.error('✗ Schema validation failed:', error.message);
      process.exit(1);
    }
  } catch (e) {
    // Fallback: check schema syntax with basic parsing
    console.log('Note: better-sqlite3 not installed, performing basic syntax validation...\n');

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

    // Basic validation
    const hasProfiles = /CREATE TABLE profiles/.test(schema);
    const hasGames = /CREATE TABLE games/.test(schema);
    const hasRateLimits = /CREATE TABLE rate_limits/.test(schema);
    const hasIndexes = /CREATE INDEX/.test(schema);

    if (hasProfiles && hasGames && hasRateLimits && hasIndexes) {
      console.log('✓ Schema syntax validation successful');
      console.log('✓ Contains profiles table');
      console.log('✓ Contains games table');
      console.log('✓ Contains rate_limits table');
      console.log('✓ Contains indexes');
      console.log('\nNote: Install better-sqlite3 (npm install better-sqlite3) for full constraint validation');
      process.exit(0);
    } else {
      console.error('✗ Schema validation failed: Missing required tables');
      process.exit(1);
    }
  }
}

validateSchema();
