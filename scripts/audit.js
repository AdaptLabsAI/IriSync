#!/usr/bin/env node

/**
 * Repository audit script
 * - Validates alias imports resolve correctly
 * - Runs npm ls to ensure there are no missing modules
 * - Runs npm outdated to surface outdated dependencies
 * - Flags deprecated dependencies we explicitly track
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(__dirname, '..');
const SRC_DIR = path.join(projectRoot, 'src');

const DEPRECATED_DEPENDENCIES = [
  'tunguska',
  'phin',
  'npmlog',
  'lodash.get',
  'inflight',
  'node-domexception',
  'glob',
  'favicon-generator',
  'fluent-ffmpeg'
];

const SUMMARY = {
  aliasIssues: [],
  missingImports: [],
  deprecatedDependencies: [],
  outdated: {},
  npmTreeHealthy: true,
};

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function hasAliasMapping() {
  const jsConfig = readJson(path.join(projectRoot, 'jsconfig.json'));
  const tsConfig = readJson(path.join(projectRoot, 'tsconfig.json'));
  const matcher = (config) => config?.compilerOptions?.paths?.['@/*']?.some((entry) => entry.replace('./', '') === 'src/*' || entry === 'src/*');

  return matcher(jsConfig) || matcher(tsConfig);
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (/\.(t|j)sx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function resolveAliasImport(importPath) {
  const relative = importPath.replace(/^@\//, '');
  const candidatePaths = [
    path.join(SRC_DIR, relative),
  ];

  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

  for (const candidate of candidatePaths) {
    for (const ext of extensions) {
      const full = candidate + ext;
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return true;
      }
    }

    // Check for index files inside directories
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      for (const ext of extensions) {
        const full = path.join(candidate, `index${ext}`);
        if (fs.existsSync(full)) {
          return true;
        }
      }
    }
  }

  return false;
}

function checkAliasImports() {
  const files = walkFiles(SRC_DIR);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const importMatches = content.matchAll(/(?:import|export)\s+(?:[^'";]+\s+from\s+)?['"](@\/[^'";]+)['"]/g);

    for (const match of importMatches) {
      const importPath = match[1];
      if (!resolveAliasImport(importPath)) {
        SUMMARY.aliasIssues.push({ file: path.relative(projectRoot, file), importPath });
      }
    }
  }
}

async function runNpmLs() {
  try {
    await execFileAsync('npm', ['ls', '--json'], { cwd: projectRoot });
  } catch (error) {
    SUMMARY.npmTreeHealthy = false;
    const stdout = error.stdout?.toString();
    if (stdout) {
      try {
        const parsed = JSON.parse(stdout);
        const problems = parsed.problems || [];
        SUMMARY.missingImports.push(...problems);
      } catch (parseError) {
        SUMMARY.missingImports.push(stdout.trim());
      }
    } else if (error.stderr) {
      SUMMARY.missingImports.push(error.stderr.toString().trim());
    }
  }
}

function collectDeprecatedDependencies() {
  const packageJson = readJson(path.join(projectRoot, 'package.json')) || {};
  const { dependencies = {}, devDependencies = {} } = packageJson;

  for (const dep of DEPRECATED_DEPENDENCIES) {
    if (dependencies[dep] || devDependencies[dep]) {
      SUMMARY.deprecatedDependencies.push(dep);
    }
  }
}

async function collectOutdatedDependencies() {
  try {
    const { stdout } = await execFileAsync('npm', ['outdated', '--json'], { cwd: projectRoot });
    if (stdout) {
      const parsed = JSON.parse(stdout);
      SUMMARY.outdated = parsed;
    }
  } catch (error) {
    if (error.stdout) {
      try {
        const parsed = JSON.parse(error.stdout.toString());
        SUMMARY.outdated = parsed;
      } catch {
        SUMMARY.outdated = { error: error.stdout.toString().trim() };
      }
    } else {
      SUMMARY.outdated = { error: error.message };
    }
  }
}

function printSummary() {
  console.log('\nRepository Audit Summary');
  console.log('==========================');
  console.log(`Alias mapping present: ${hasAliasMapping() ? 'yes' : 'no'}`);

  if (!hasAliasMapping()) {
    SUMMARY.aliasIssues.push({ file: 'jsconfig.json/tsconfig.json', importPath: '@/* -> src/*' });
  }

  if (SUMMARY.aliasIssues.length > 0) {
    console.log('\nUnresolved alias imports:');
    for (const issue of SUMMARY.aliasIssues) {
      console.log(`  - ${issue.file}: ${issue.importPath}`);
    }
  } else {
    console.log('\nAll alias imports resolved successfully.');
  }

  if (!SUMMARY.npmTreeHealthy) {
    console.log('\nDependency tree issues detected:');
    for (const message of SUMMARY.missingImports) {
      console.log(`  - ${message}`);
    }
  } else {
    console.log('\nDependency tree is healthy (npm ls)');
  }

  if (SUMMARY.deprecatedDependencies.length > 0) {
    console.log('\nDeprecated dependencies detected:');
    for (const dep of SUMMARY.deprecatedDependencies) {
      console.log(`  - ${dep}`);
    }
  } else {
    console.log('\nNo tracked deprecated dependencies detected.');
  }

  const outdatedKeys = Object.keys(SUMMARY.outdated || {});
  if (outdatedKeys.length > 0) {
    console.log('\nOutdated dependencies:');
    for (const key of outdatedKeys) {
      const info = SUMMARY.outdated[key];
      if (info && typeof info === 'object') {
        console.log(`  - ${key} (current: ${info.current}, latest: ${info.latest})`);
      } else {
        console.log(`  - ${key}: ${info}`);
      }
    }
  } else {
    console.log('\nNo outdated dependencies reported.');
  }

  console.log('\nAudit complete.');
}

(async () => {
  const args = process.argv.slice(2);
  const isCi = args.includes('--ci');

  checkAliasImports();
  collectDeprecatedDependencies();
  await runNpmLs();
  await collectOutdatedDependencies();
  printSummary();

  if (isCi) {
    const hasIssues =
      SUMMARY.aliasIssues.length > 0 ||
      !SUMMARY.npmTreeHealthy ||
      SUMMARY.deprecatedDependencies.length > 0 ||
      (SUMMARY.outdated && Object.keys(SUMMARY.outdated).length > 0);

    if (hasIssues) {
      process.exitCode = 1;
    }
  }
})();
