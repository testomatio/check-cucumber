#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const analyze = require('../analyzer');
const Reporter = require('../reporter');


console.log(chalk.cyan.bold(' 🤩 Cucumber checker by testomat.io'));
const apiKey = process.env['INPUT_TESTOMATIO-KEY'] || process.env['TESTOMATIO'];

program
  .option('-d, --dir <dir>', 'Test directory')
  .option('-c, --codeceptjs', 'Is codeceptJS project')
  .action((opts) => {
    const data = analyze('**/*.feature', opts.dir || process.cwd());
    data.then(features => {
      let scenarioSkipped = 0;
      const tests = [];
      const errors = [];
      for (const suite of features) {
        if (suite.scenario) {
          for (const scenario of suite.scenario) {
            const {
              name, description, code, file, steps,
            } = scenario;
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
        const reporter = new Reporter(apiKey, opts.codeceptjs);
        reporter.addTests(tests);
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
  });


if (process.argv.length <= 2) {
  program.outputHelp();
}

program.parse(process.argv);
