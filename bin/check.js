#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const analyze = require('../analyzer');
const Reporter = require('../reporter');


console.log(chalk.cyan.bold(' 🤩 Cucumber checker by testomat.io'));
const apiKey = process.env['INPUT_TESTOMATIO-KEY'] || process.env['TESTOMATIO'];

program
  .option('-d, --dir <dir>', 'Test directory')
  .action((opts) => {
    const data = analyze('**/*.feature', opts.dir || process.cwd());
    data.then(features => {
      let scenarioSkipped = 0;
      const tests = [];
      for (const suite of features) {
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
      }
      if (tests.length) {
        const reporter = new Reporter(apiKey);
        reporter.addTests(tests);
        console.log(chalk.greenBright.bold(`Total Scenarios found ${tests.length}`));
        if (scenarioSkipped) console.log(chalk.red.bold(`Total Scenarios skipped ${scenarioSkipped}`));
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
