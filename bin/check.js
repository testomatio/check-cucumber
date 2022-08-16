#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const analyze = require('../analyzer');
const Reporter = require('../reporter');
const { updateFiles, cleanFiles, checkFiles } = require('../util');

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
  .option('-c, --codeceptjs', 'Is codeceptJS project')
  .option('--sync', 'import tests to testomatio and wait for completion')
  .option('-U, --update-ids', 'Update test and suite with testomatio ids')
  .option('--clean-ids', 'Remove testomatio ids from test and suite')
  .option('--purge, --unsafe-clean-ids', 'Remove testomatio ids from test and suite without server verification')
  .option('--check-ids', 'Do not synchronize with testomatio, only check if all suites and tests have IDs')
  .option('--create', 'Create tests and suites for missing IDs')
  .option('--no-empty', 'Remove empty suites after import')
  .option('--keep-structure', 'Prefer structure of source code over structure in Testomat.io')
  .option('--no-detached', 'Don\t mark all unmatched tests as detached')
  .action(async (filesArg, opts) => {
    const isPattern = checkPattern(filesArg);
    const features = await analyze(filesArg || '**/*.feature', opts.dir || process.cwd());
    if (opts.cleanIds || opts.unsafeCleanIds) {
      let idMap = {};
      if (apiKey) {
        const reporter = new Reporter(apiKey.trim(), opts.codeceptjs);
        idMap = await reporter.getIds();
      } else if (opts.cleanIds) {
        console.log(' ✖️  API key not provided');
        return;
      }
      const files = cleanFiles(features, idMap, opts.dir || process.cwd(), opts.unsafeCleanIds);
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
          files[file] = fs.readFileSync(path.join(opts.dir || process.cwd(), file)).toString();
          if (name) {
            let fileName = file;
            if (process.env.TESTOMATIO_PREPEND_DIR) {
              fileName = path.join(process.env.TESTOMATIO_PREPEND_DIR, file);
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
        console.log('Checking test IDs...');
        const {checkedFiles, suitesWithoutIds, testsWithoutIds} = checkFiles(features, opts.dir || process.cwd());
        console.log(`${checkedFiles.length} Files checked`);
        if (suitesWithoutIds.length || testsWithoutIds.length) {
          console.log(
            `\n ⚠️  ${suitesWithoutIds.length} suites and ${testsWithoutIds.length} tests are missing test IDs!`
          );
          console.log(
            "    Use the `--update-ids` flag to update the files.\n"
          );
        }
      } else {
        const resp = reporter.send({
          branch,
          sync: opts.sync || opts.updateIds,
          noempty: !opts.empty,
          'no-detach': !isPattern || !opts.detached,
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
            reporter.getIds().then(idMap => {
              const updatedFiles = updateFiles(features, idMap, opts.dir || process.cwd());
              console.log(`${updatedFiles.length} Files updated`);
            });
          } else {
            console.log(' ✖️  API key not provided');
          }
        }
      }
    } else {
      console.log('Can\'t find any tests in this folder');
      console.log('Change file pattern or directory to scan to find test files:\n\nUsage: npx check-cucumber -d[directory]');
    }
  });


if (process.argv.length <= 2) {
  program.outputHelp();
}

program.parse(process.argv);
