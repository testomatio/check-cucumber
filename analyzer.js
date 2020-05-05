const Gherkin = require('gherkin').default;
const chalk = require('chalk');
const glob = require('glob');
const path = require('path');

let workDir;

const getLocation = scenario => (scenario.tags.length ? scenario.tags[0].location.line - 1 : scenario.location.line - 1);

const getTitle = scenario => {
  let { name } = scenario;

  if (scenario.tags.length) {
    let tags = '-';
    for (const tag of scenario.tags) {
      tags = `${tags} ${tag.name}`;
    }

    name = `${name} ${tags}`;
  }

  return name;
};

const getScenarioCode = (source, feature, file) => {
  const sourceArray = source.split('\n');
  const fileName = file.replace(workDir + path.sep, '');
  const scenarios = [];
  for (let i = 0; i < feature.children.length; i += 1) {
    const { scenario } = feature.children[i];
    if (scenario) {
      if (!scenario.name) {
        console.log(chalk.red('Title of scenario cannot be empty, So skipping this'));
      } else {
        console.log(' - ', scenario.name);
      }
      const steps = [];
      const scenarioJson = { name: getTitle(scenario), file: fileName };
      const start = getLocation(scenario);
      const end = ((i === feature.children.length - 1) ? sourceArray.length : getLocation(feature.children[i + 1].scenario));
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
        const fileName = file.replace(workDir + path.sep, '');
        if (!fileName.includes('node_modules')) {
          console.log('___________________________\n');
          console.log(' 🗒️  File : ', fileName, '\n');
          if (data[1].gherkinDocument) {
            console.log('= ', data[1].gherkinDocument.feature.name);
            featureData.feature = data[1].gherkinDocument.feature.name;
            featureData.scenario = getScenarioCode(data[0].source.data, data[1].gherkinDocument.feature, file);
          } else {
            featureData.error = `${fileName} : ${data[1].attachment.data}`;
            console.log(chalk.red(`Wrong format,  So skipping this: ${data[1].attachment.data}`));
          }
          console.log('\n');
        }
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
