#!/usr/bin/env node

require('dotenv').config();
const program = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const analyze = require('../analyzer');
const Reporter = require('../reporter');
const { updateFiles, cleanFiles, checkFiles } = require('../util');
const Pull = require('../pull');

function checkPattern(pattern) {
  pattern = pattern.trim(); // eslint-disable-line
  if (!pattern) return true;
  if (pattern === '.') return true;
  return pattern.includes('*');
}

const { version } = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')).toString());

console.log(chalk.cyan.bold(` 🤩 Cucumber checker by Testomat.io v${version}`));
const apiKey = process.env['INPUT_TESTOMATIO-KEY'] || process.env.TESTOMATIO || '';
const branch = process.env.TESTOMATIO_BRANCH;

program
  .arguments('<files>')
  .option('-d, --dir <dir>', 'Test directory')
  .option('-e, --exclude <pattern>', 'Exclude files by glob pattern')
  .option('-c, --codeceptjs', 'Is codeceptJS project')
  .option('--sync', 'import tests to testomatio and wait for completion')
  .option('-U, --update-ids', 'Update test and suite with testomatio ids')
  .option('--clean-ids', 'Remove testomatio ids from test and suite')
  .option('--purge, --unsafe-clean-ids', 'Remove testomatio ids from test and suite without server verification')
  .option('--check-ids', 'Ensure that all suites and tests have testomatio ids before the import')
  .option('--create', 'Create tests and suites for missing IDs')
  .option('--no-empty', 'Remove empty suites after import')
  .option('--keep-structure', 'Prefer structure of source code over structure in Testomat.io')
  .option('--no-detached', 'Don\t mark all unmatched tests as detached')
  .action(async (filesArg, opts) => {
    const workDir = opts.dir || process.cwd();
    const isPattern = checkPattern(filesArg);
    const features = await analyze(filesArg || '**/*.feature', workDir, opts.exclude);
    if (opts.cleanIds || opts.unsafeCleanIds) {
      let idMap = {};
      if (apiKey) {
        const reporter = new Reporter(apiKey.trim(), opts.codeceptjs);
        idMap = await reporter.getIds();
      } else if (opts.cleanIds) {
        console.log(' ✖️  API key not provided');
        return;
      }
      const files = cleanFiles(features, idMap, workDir, opts.unsafeCleanIds);
      console.log(`    ${files.length} files updated.`);
      return;
    }
    let scenarioSkipped = 0;
    const tests = [];
    const errors = [];
    const files = {};
    for (const suite of features) {
      if (suite.scenario) {
        for (const scenario of suite.scenario) {
          const {
            name, description, code, file, steps, tags,
          } = scenario;
          if (name) {
            let fileName = file;
            // make file path relative to TESTOMATIO_WORKDIR if provided
            if (process.env.TESTOMATIO_WORKDIR && fileName) {
              const workdir = path.resolve(process.env.TESTOMATIO_WORKDIR);
              const absoluteTestPath = path.resolve(fileName);
              fileName = path.relative(workdir, absoluteTestPath);
            }
            if (process.env.TESTOMATIO_PREPEND_DIR) {
              fileName = path.join(process.env.TESTOMATIO_PREPEND_DIR, file);
            }
            // Store file content using the final fileName as key for consistency, but avoid duplicate reads
            if (!files[fileName]) {
              files[fileName] = fs.readFileSync(path.join(workDir, file)).toString();
            }
            tests.push({
              name, suites: [suite.feature], tags, description, code, file: fileName, steps,
            });
          } else {
            scenarioSkipped += 1;
          }
        }
      } else if (suite.error) {
        errors.push(suite.error);
      }
    }
    if (tests.length) {
      const reporter = new Reporter(apiKey.trim(), opts.codeceptjs);
      reporter.addTests(tests);
      reporter.addFiles(files);
      console.log(chalk.greenBright.bold(`Total Scenarios found ${tests.length} \n`));
      if (scenarioSkipped) console.log(chalk.red.bold(`Total Scenarios skipped ${scenarioSkipped}\n`));
      if (errors.length) {
        console.log(chalk.red.bold('Errors :'));
        for (const error of errors) {
          console.log(chalk.red(error));
        }
      }

      if (opts.checkIds) {
        console.log("Checking test IDs...");
        const { checkedFiles, suitesWithoutIds, testsWithoutIds } = checkFiles(
          features,
          workDir
        );
        console.log(` ${checkedFiles.length} Files checked`);
        if (suitesWithoutIds.length || testsWithoutIds.length) {
          console.log(
            `\n 🔴 ${suitesWithoutIds.length} suites and ${testsWithoutIds.length} tests are missing test IDs!`
          );
          console.log("    Use the `--update-ids` flag to update the files.\n");
          process.exit(1);
        }
      }

      const resp = reporter.send({
        branch,
        sync: opts.sync || opts.updateIds,
        noempty: !opts.empty,
        suite: process.env.TESTOMATIO_SUITE,
        'no-detach': process.env.TESTOMATIO_NO_DETACHED || !opts.detached,
        structure: opts.keepStructure,
        create: opts.create || false,
      });

      if (opts.sync || opts.updateIds) {
        console.log('    Wait for Testomatio to synchronize tests...');
        await resp;
      }
      if (opts.updateIds) {
        console.log('Updating test IDs...');
        if (apiKey) {
          reporter.getIds({ branch }).then(idMap => {
            const updatedFiles = updateFiles(features, idMap, workDir);
            console.log(`${updatedFiles.length} Files updated`);
          });
        } else {
          console.log(' ✖️  API key not provided');
        }
      }
    } else {
      console.log('Can\'t find any tests in this folder');
      console.log('Change file pattern or directory to scan to find test files:\n\nUsage: npx check-cucumber -d[directory]');
    }
  });

// Pull command
program
  .command('pull')
  .description('Pull manual tests from Testomat.io as .feature files')
  .option('-d, --dir <dir>', 'Target directory', '.')
  .option('--dry-run', 'Show what files would be created without creating them')
  .action(async (opts) => {
    if (!apiKey) {
      console.log(chalk.red(' ✖️  API key not provided. Set TESTOMATIO environment variable.'));
      process.exit(1);
    }

    try {
      const reporter = new Reporter(apiKey.trim());
      const pull = new Pull(reporter, opts.dir);
      await pull.execute({ dryRun: opts.dryRun });
    } catch (error) {
      console.error(chalk.red('Pull failed:'), error.message);
      process.exit(1);
    }
  });

// Push command - alias for main command with default pattern
program
  .command('push')
  .description('Push feature files to Testomat.io (alias for main command)')
  .option('-d, --dir <dir>', 'Test directory')
  .option('-e, --exclude <pattern>', 'Exclude files by glob pattern')
  .option('-c, --codeceptjs', 'Is codeceptJS project')
  .option('--sync', 'Import tests and wait for completion')
  .option('-U, --update-ids', 'Update test IDs in files after push')
  .option('--clean-ids', 'Remove test IDs from feature files')
  .option('--purge, --unsafe-clean-ids', 'Remove test IDs without server verification')
  .option('--check-ids', 'Ensure that all suites and tests have test IDs before import')
  .option('--create', 'Create tests and suites for missing IDs')
  .option('--no-empty', 'Remove empty suites after import')
  .option('--keep-structure', 'Prefer structure of source code over structure in Testomat.io')
  .option('--no-detached', 'Don\'t mark all unmatched tests as detached')
  .action(async (cmd) => {
    
    // Use default pattern if none provided
    const filesArg = '**/*.feature';
    
    // Call the main command logic directly with cmd as options (like check-tests does)
    const workDir = cmd.dir || process.cwd();
    const isPattern = checkPattern(filesArg);
    const features = await analyze(filesArg, workDir, cmd.exclude);
    
    if (cmd.cleanIds || cmd.unsafeCleanIds) {
      let idMap = {};
      if (apiKey) {
        const reporter = new Reporter(apiKey.trim(), cmd.codeceptjs);
        idMap = await reporter.getIds();
      } else if (cmd.cleanIds) {
        console.log(' ✖️  API key not provided');
        return;
      }
      const files = cleanFiles(features, idMap, workDir, cmd.unsafeCleanIds);
      console.log(`    ${files.length} files updated.`);
      return;
    }
    
    let scenarioSkipped = 0;
    const tests = [];
    const errors = [];
    const files = {};
    
    for (const suite of features) {
      if (suite.scenario) {
        for (const scenario of suite.scenario) {
          const {
            name, description, code, file, steps, tags,
          } = scenario;
          if (name) {
            let fileName = file;
            // make file path relative to TESTOMATIO_WORKDIR if provided
            if (process.env.TESTOMATIO_WORKDIR && fileName) {
              const workdir = path.resolve(process.env.TESTOMATIO_WORKDIR);
              const absoluteTestPath = path.resolve(fileName);
              fileName = path.relative(workdir, absoluteTestPath);
            }
            if (process.env.TESTOMATIO_PREPEND_DIR) {
              fileName = path.join(process.env.TESTOMATIO_PREPEND_DIR, file);
            }
            // Store file content using the final fileName as key for consistency, but avoid duplicate reads
            if (!files[fileName]) {
              files[fileName] = fs.readFileSync(path.join(workDir, file)).toString();
            }
            tests.push({
              name, suites: [suite.feature], tags, description, code, file: fileName, steps,
            });
          } else {
            scenarioSkipped += 1;
          }
        }
      } else if (suite.error) {
        errors.push(suite.error);
      }
    }
    
    if (tests.length) {
      const reporter = new Reporter(apiKey.trim(), cmd.codeceptjs);
      reporter.addTests(tests);
      reporter.addFiles(files);
      console.log(chalk.greenBright.bold(`Total Scenarios found ${tests.length} \n`));
      if (scenarioSkipped) console.log(chalk.red.bold(`Total Scenarios skipped ${scenarioSkipped}\n`));
      if (errors.length) {
        console.log(chalk.red.bold('Errors :'));
        for (const error of errors) {
          console.log(chalk.red(error));
        }
      }

      if (cmd.checkIds) {
        console.log("Checking test IDs...");
        const { checkedFiles, suitesWithoutIds, testsWithoutIds } = checkFiles(
          features,
          workDir
        );
        console.log(` ${checkedFiles.length} Files checked`);
        if (suitesWithoutIds.length || testsWithoutIds.length) {
          console.log(
            `\n 🔴 ${suitesWithoutIds.length} suites and ${testsWithoutIds.length} tests are missing test IDs!`
          );
          console.log("    Use the `--update-ids` flag to update the files.\n");
          process.exit(1);
        }
      }

      const resp = reporter.send({
        branch,
        sync: cmd.sync || cmd.updateIds,
        noempty: !cmd.empty,
        suite: process.env.TESTOMATIO_SUITE,
        'no-detach': process.env.TESTOMATIO_NO_DETACHED || !cmd.detached,
        structure: cmd.keepStructure,
        create: cmd.create || false,
      });

      if (cmd.sync || cmd.updateIds) {
        console.log('    Wait for Testomatio to synchronize tests...');
        await resp;
      }
      if (cmd.updateIds) {
        console.log('Updating test IDs...');
        if (apiKey) {
          reporter.getIds({ branch }).then(idMap => {
            const updatedFiles = updateFiles(features, idMap, workDir);
            console.log(`${updatedFiles.length} Files updated`);
          });
        } else {
          console.log(' ✖️  API key not provided');
        }
      }
    } else {
      console.log('Can\'t find any tests in this folder');
      console.log('Change file pattern or directory to scan to find test files:\n\nUsage: npx check-cucumber push -d [directory]');
    }
  });

if (process.argv.length <= 2) {
  program.outputHelp();
}

program.parse(process.argv);
