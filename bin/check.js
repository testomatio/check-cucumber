#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const analyze = require('../analyzer');
const Reporter = require('../reporter');


console.log(chalk.cyan.bold('Cucumber checker by testomat.io'));
const apiKey = process.env['INPUT_TESTOMATIO-KEY'] || process.env['TESTOMATIO'] || 'bu8e29984sqd';

program
  .arguments('<files>')
  .option('-d, --dir <dir>', 'Test directory')
  .action((files, opts) => {
    const data = analyze(files, opts.dir || process.cwd());
    data.then(features => {
      const tests = [];
      for (const suite of features) {
        for (const scenario of suite.scenario) {
          const { name, description, code, file, steps } = scenario;
          console.log(code);
          tests.push({ name, suites: [suite.feature], description, code, file, steps });
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