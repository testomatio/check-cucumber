#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');
const analyze = require('../analyzer');
const Reporter = require('../reporter');


console.log(chalk.cyan.bold('Cucumber checker by testomat.io'));
<<<<<<< HEAD
const apiKey = process.env['INPUT_TESTOMATIO-KEY'] || process.env['TESTOMATIO'] || 'bu8e29984sqd';
=======
const apiKey = process.env['INPUT_TESTOMATIO-KEY'] || process.env['TESTOMATIO'] || 'l5x5d5cd6pc3';
>>>>>>> 13ab9a5ead61cda35e92f401bf8a11b2380029b8

program
  .arguments('<files>')
  .option('-d, --dir <dir>', 'Test directory')
  .action((files, opts) => {
    const data = analyze(files, opts.dir || process.cwd());
    data.then(features => {
      const tests = [];
      for (const suite of features) {
        for (const scenario of suite.scenario) {
<<<<<<< HEAD
          const { name, description, code, file, steps } = scenario;
          console.log(code);
          tests.push({ name, suites: [suite.feature], description, code, file, steps });
=======
          const { name, description } = scenario;
          tests.push({ name, suites: [suite.feature], description });
>>>>>>> 13ab9a5ead61cda35e92f401bf8a11b2380029b8
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