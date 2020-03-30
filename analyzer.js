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
        includeSource: true,
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
        console.log(' -', data[1].gherkinDocument.feature.name);
        featureData['feature'] = data[1].gherkinDocument.feature.name;
        featureData['scenario'] = getScenarioCode(data[0].source.data, data[1].gherkinDocument.feature, file);
        console.log('\n');
        resolve(featureData);
      });
    } catch (e) {
      reject(e);
    }
  })
};

const getScenarioCode = (source, feature, file) => {
  const sourceArray = source.split('\n');
  const scenarios = [];
  for (let i = 0; i < feature.children.length; i++) {
    const scenario = feature.children[i].scenario;
    if (scenario) {
      const steps = [];
      const { name, description } = scenario;
      const scenarioJson = { name, file };
      const start = scenario.location.line - 1;
      const end = ((i === feature.children.length - 1) ? sourceArray.length : feature.children[i + 1].scenario.location.line) - 1;
      for (const step of scenario.steps) {
        steps.push(step.text);
      }
      scenarioJson['code'] = sourceArray.slice(start, end).join('\n');
      scenarioJson['steps'] = steps;
      scenarios.push(scenarioJson);
    }
  }

  return scenarios;
};

module.exports = analyzeFeatureFiles;
