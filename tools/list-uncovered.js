#!/usr/bin/env node

/**
 * Helper script to list uncovered branches inside apps/api/src based on Jest coverage.
 */
const fs = require('fs');
const path = require('path');

const coveragePath = path.resolve(__dirname, '..', 'coverage', 'coverage-final.json');

if (!fs.existsSync(coveragePath)) {
  console.error('coverage/coverage-final.json not found. Run tests with --coverage first.');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const rows = [];

for (const [file, data] of Object.entries(coverage)) {
  if (!file.includes('/apps/api/src/')) continue;
  const branchMap = data.branchMap || {};
  const branches = data.b || {};

  for (const [branchId, meta] of Object.entries(branchMap)) {
    const hits = branches[branchId] || [];
    if (!hits.length) continue;
    if (hits.every((hit) => Number(hit) === 0)) {
      rows.push({
        file,
        line: meta.loc?.start?.line ?? null,
        type: meta.type,
        id: branchId,
      });
    }
  }
}

rows
  .sort((a, b) => a.file.localeCompare(b.file) || ((a.line || 0) - (b.line || 0)))
  .forEach((row) => {
    const location = row.line ? `${row.file}:${row.line}` : row.file;
    console.log(`${location}  branch#${row.id} (${row.type})`);
  });
