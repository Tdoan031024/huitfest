const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const dumpFile = path.join(rootDir, 'prisma', 'migrations', 'huitfest.sql');
const schemaFile = path.join(rootDir, 'prisma', 'schema.prisma');

function collectMatches(regex, input) {
  const results = [];
  let match;
  while ((match = regex.exec(input)) !== null) {
    results.push(match);
  }
  return results;
}

function buildDataRefreshSql(dumpSql) {
  const tableSet = new Set();

  const createTableMatches = collectMatches(/CREATE TABLE\s+`([^`]+)`/gi, dumpSql);
  for (const match of createTableMatches) {
    tableSet.add(match[1]);
  }

  const insertMatches = collectMatches(/INSERT INTO\s+`([^`]+)`[\s\S]*?;/gi, dumpSql);
  const insertStatements = insertMatches.map((match) => {
    tableSet.add(match[1]);
    return match[0].trim();
  });

  if (insertStatements.length === 0) {
    throw new Error('No INSERT statements found in prisma/migrations/huitfest.sql');
  }

  const tableNames = Array.from(tableSet).sort();
  const truncateStatements = tableNames.map((tableName) => `TRUNCATE TABLE \`${tableName}\`;`);

  return {
    sql: [
      'SET FOREIGN_KEY_CHECKS = 0;',
      'START TRANSACTION;',
      ...truncateStatements,
      ...insertStatements,
      'COMMIT;',
      'SET FOREIGN_KEY_CHECKS = 1;'
    ].join('\n\n'),
    tableCount: tableNames.length,
    insertCount: insertStatements.length
  };
}

function runPrismaDbExecute(filePath) {
  const quote = (value) => `"${String(value).replace(/"/g, '\\"')}"`;
  const command = `npx prisma db execute --file ${quote(filePath)} --schema ${quote(schemaFile)}`;

  const result = spawnSync(command, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

function main() {
  if (!fs.existsSync(dumpFile)) {
    throw new Error(`SQL dump not found: ${dumpFile}`);
  }

  const dumpSql = fs.readFileSync(dumpFile, 'utf8');
  const { sql, tableCount, insertCount } = buildDataRefreshSql(dumpSql);

  const tempFile = path.join(os.tmpdir(), `huitfest-data-refresh-${Date.now()}.sql`);

  try {
    fs.writeFileSync(tempFile, sql, 'utf8');
    console.log(`Applying huitfest.sql data snapshot (${tableCount} tables, ${insertCount} INSERT blocks)...`);
    runPrismaDbExecute(tempFile);
    console.log('huitfest.sql data snapshot applied successfully.');
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

main();
