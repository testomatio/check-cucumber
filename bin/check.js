#!/usr/bin/env node

const program = require('commander');
const chalk = require('chalk');

console.log(chalk.cyan.bold('Cucumber checker by testomat.io'));

program
  .option('-c, --check')

program.parse(process.argv);

if (program.check)
  console.log(chalk.green.bold('Cucumber check successful'));