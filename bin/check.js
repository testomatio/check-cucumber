#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const analyze = require('../analyzer');
const Reporter = require('../reporter');
const { updateFiles } = require('../util');

const version = JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json')).toString()).version;

console.log(chalk.cyan.bold(' 🤩 Cucumber checker by Testomat.io v'+version));
const apiKey = process.env['INPUT_TESTOMATIO-KEY'] || process.env.TESTOMATIO || '';

program
  .arguments('<files>')
  .option('-d, --dir <dir>', 'Test directory')
  .option('-c, --codeceptjs', 'Is codeceptJS project')
  .option('-U, --update-ids', 'Update test and suite with testomatio ids')
  .action(async (filesArg, opts) => {
    const features = await analyze(filesArg || '**/*.feature', opts.dir || process.cwd());
    if (opts.updateIds) {
      console.log('Update test files called');
      if (apiKey) {
        const reporter = new Reporter(apiKey.trim(), opts.codeceptjs);
        reporter.getIds().then(idMap => {
          updateFiles(features, idMap, opts.dir || process.cwd());
          // util.updateFiles(analyzer.rawTests, idMap, opts.dir || process.cwd())
        });
      } else {
        console.log(' ✖️  API key not provided');
      }
      console.log('Files updated');
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
            name, description, code, file, steps,
          } = scenario;
          files[file] = fs.readFileSync(path.join(opts.dir || process.cwd(), file)).toString();
          if (name) {
            tests.push({
              name, suites: [suite.feature], description, code, file, steps,
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
      reporter.send();
    } else {
      console.log('Can\'t find any tests in this folder');
      console.log('Change file pattern or directory to scan to find test files:\n\nUsage: npx check-cucumber -d[directory]');
    }
  });


if (process.argv.length <= 2) {
  program.outputHelp();
}

program.parse(process.argv);
