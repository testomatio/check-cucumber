const Gherkin = require('gherkin').default
const glob = require('glob')
const path = require('path');
const chalk = require('chalk');


/**
 * 
 * @param {String} filePattern 
 * @param {String} dir 
 */
const analyzeFeatureFiles = (filePattern, dir = '.') => {
  console.log('\nParsing files\n');
  pattern = path.join(dir, filePattern);

  const promise = new Promise((resolve, reject) => {
    const promiseArray = [];
    glob(pattern, (er, files) => {
      for (const file of files) {
        promiseArray.push(parseFile(file));
      }

      const resultArray = Promise.all(promiseArray);
      resultArray.then(resolve)
    });
  });

  return promise;
};

const parseFile = file => {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        includeSource: false,
        includeGherkinDocument: true,
        includePickles: true,
      }
      const stream = Gherkin.fromPaths([file], options)
      const data = [];
      const featureData = {};
      stream.on('data', function (chunk) {
        data.push(chunk);
      });

      stream.on('end', function () {
        console.log(chalk.cyan.bold(file))
        console.log(' -', data[0].gherkinDocument.feature.name);
        featureData['feature'] = data[0].gherkinDocument.feature.name;
        const scenarios = []
        for (let i = 1; i < data.length; i += 1) {
          console.log('  -', data[i].pickle.name);
          const description = data[i].pickle.steps.reduce((acc, step) => {
            acc += `* ${step.text}\n`
            return acc;
          }, '');

          scenarios.push({ name: data[i].pickle.name, description });
        }
        featureData['scenario'] = scenarios;
        console.log('\n');

        resolve(featureData);
      });
    } catch (e) {
      reject(e);
    }
  })
};

module.exports = analyzeFeatureFiles;
