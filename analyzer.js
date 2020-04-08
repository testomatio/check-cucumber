const Gherkin = require('gherkin').default;
const glob = require('glob');
const path = require('path');

let workDir;

const getScenarioCode = (source, feature, file) => {
  const sourceArray = source.split('\n');
  const fileName = file.replace(workDir + path.sep, '');
  const scenarios = [];
  for (let i = 0; i < feature.children.length; i += 1) {
    const { scenario } = feature.children[i];
    console.log(' - ', scenario.name);
    if (scenario) {
      const steps = [];
      const { name } = scenario;
      const scenarioJson = { name, file: fileName };
      const start = scenario.location.line - 1;
      const end = ((i === feature.children.length - 1) ? sourceArray.length : feature.children[i + 1].scenario.location.line) - 1;
      for (const step of scenario.steps) {
        steps.push(step.text);
      }
      scenarioJson.code = sourceArray.slice(start, end).join('\n');
      scenarioJson.steps = steps;
      scenarios.push(scenarioJson);
    }
  }

  return scenarios;
};

const parseFile = file => {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        includeSource: true,
        includeGherkinDocument: true,
        includePickles: true,
      };
      const stream = Gherkin.fromPaths([file], options);
      const data = [];
      const featureData = {};
      stream.on('data', (chunk) => {
        data.push(chunk);
      });

      stream.on('end', () => {
        console.log('___________________________\n');
        const fileName = file.replace(workDir + path.sep, '');
        console.log(' 🗒️  File : ', fileName, '\n');
        console.log('= ', data[1].gherkinDocument.feature.name);
        featureData.feature = data[1].gherkinDocument.feature.name;
        featureData.scenario = getScenarioCode(data[0].source.data, data[1].gherkinDocument.feature, file);
        console.log('\n');
        resolve(featureData);
      });
    } catch (e) {
      reject(e);
    }
  });
};

/**
 *
 * @param {String} filePattern
 * @param {String} dir
 */
const analyzeFeatureFiles = (filePattern, dir = '.') => {
  workDir = dir;

  console.log('\n 🗄️  Parsing files\n');
  const pattern = path.join(dir, filePattern);

  const promise = new Promise((resolve) => {
    const promiseArray = [];
    glob(pattern, (er, files) => {
      for (const file of files) {
        promiseArray.push(parseFile(file));
      }

      const resultArray = Promise.all(promiseArray);
      resultArray.then(resolve);
    });
  });

  return promise;
};


module.exports = analyzeFeatureFiles;
