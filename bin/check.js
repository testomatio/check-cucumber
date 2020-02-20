#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const analyze = require('../analyzer');
const Reporter = require('../reporter');


console.log(chalk.cyan.bold('Cucumber checker by testomat.io'));
const apiKey = process.env['INPUT_TESTOMATIO-KEY'] || process.env['TESTOMATIO'] || 'l5x5d5cd6pc3';

program
  .arguments('<files>')
  .option('-d, --dir <dir>', 'Test directory')
  .action((files, opts) => {
    const data = analyze(files, opts.dir || process.cwd());
    data.then(features => {
      const tests = [];
      for (const suite of features) {
        for (const test of suite.scenario) {
          tests.push({ name: test, suites: [suite.feature] });
        }
      }

      const reporter = new Reporter(apiKey);
      reporter.addTests(tests);
      reporter.send();
    })
  });


if (process.argv.length <= 2) {
  program.outputHelp();
}

program.parse(process.argv);