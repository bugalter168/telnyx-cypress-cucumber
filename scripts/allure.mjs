#!/usr/bin/env node
/**
 * Allure + artifact housekeeping: generate | open | clean.
 *
 * Exists so `config/paths.json` is the ONE place the artifact directories are named — the
 * Cypress configs, this script and the CI workflow all read it. Never hard-code the paths.
 */
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import allureCommandline from 'allure-commandline';
import { rimrafSync } from 'rimraf';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @type {{allureResultsDir: string, allureReportDir: string, allureHistoryDir: string, screenshotsDir: string, videosDir: string}} */
const paths = JSON.parse(readFileSync(join(ROOT, 'config/paths.json'), 'utf8'));

const resultsDir = join(ROOT, paths.allureResultsDir);
const reportDir = join(ROOT, paths.allureReportDir);
const historyDir = join(ROOT, paths.allureHistoryDir);

/**
 * Uses allure-commandline's programmatic entry point, which resolves the platform-correct
 * launcher and handles quoting. Requires a Java runtime on PATH.
 */
function allure(args) {
  const child = allureCommandline(args);
  child.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });
  child.on('error', (error) => {
    console.error('Failed to launch the Allure CLI. Is a Java JDK installed and on PATH?');
    console.error(error.message);
    process.exitCode = 1;
  });
}

const command = process.argv[2];

switch (command) {
  case 'generate': {
    if (!existsSync(resultsDir)) {
      console.error(
        `No results at ${paths.allureResultsDir}. Run "npm run test:local" or "npm run test:ci" first.`,
      );
      process.exit(1);
    }
    // Without this the trend graph resets to a single point on every run.
    if (existsSync(historyDir)) {
      mkdirSync(join(resultsDir, 'history'), { recursive: true });
      cpSync(historyDir, join(resultsDir, 'history'), { recursive: true });
      console.log('Restored previous trend history into the result set.');
    }
    allure(['generate', resultsDir, '--clean', '-o', reportDir]);
    break;
  }

  case 'open':
    if (!existsSync(reportDir)) {
      console.error(`No report at ${paths.allureReportDir}. Run "npm run report:generate" first.`);
      process.exit(1);
    }
    allure(['open', reportDir]);
    break;

  case 'clean': {
    const targets = [
      paths.allureResultsDir,
      paths.allureReportDir,
      paths.screenshotsDir,
      paths.videosDir,
    ];
    for (const target of targets) {
      rimrafSync(join(ROOT, target));
      console.log(`Removed ${target}`);
    }
    break;
  }

  default:
    console.error('Usage: node scripts/allure.mjs <generate|open|clean>');
    process.exit(1);
}
