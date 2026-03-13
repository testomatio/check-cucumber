const Gherkin = require('gherkin').default;
const chalk = require('chalk');
const glob = require('glob');
const path = require('path');


let workDir;
const invalidKeys = ['And', 'But'];

const getLocation = ({ feature, scenario, rule }) => {
  const message = feature || scenario || rule;
  if (message.tags && message.tags.length) {
    return message.tags[0].location.line - 1;
  }
  return message.location.line - 1;
};

const getLocations = ({ feature, scenario, rule }) => {
  if (feature) return feature.children.flatMap(getLocations);
  if (scenario) return [ getLocation({ scenario}) ];
  if (rule) return [getLocation({ rule }), ...rule.children.flatMap(getLocations)];
  return [];
};

const getTitle = scenario => {
  let { name } = scenario;

  if (scenario.tags.length) {
    let tags = '';
    for (const tag of scenario.tags) {
      tags = `${tags} ${tag.name}`;
    }

    name = `${name}${tags}`;
  }

  return name;
};

const getScenarioCode = (source, feature, file) => {
  const sourceArray = source.split('\n');
  const fileName = path.relative(workDir, file);
  const scenarios = [];
  const [_, ...endLocations] = [...getLocations({ feature }), sourceArray.length];
  let inRule = false;

  const handleScenario = (scenario) => {
    if (!scenario.name) {
      console.log(chalk.red('Title of scenario cannot be empty, skipping this'));
    } else {
      console.log(inRule ? '  - ' : ' - ', scenario.name);
    }
    const steps = [];
    let previousValidStep = '';
    const scenarioJson = { name: scenario.name, file: fileName };
    const start = getLocation({ scenario });
    const end = endLocations.shift();
    for (const step of scenario.steps) {
      let keyword = step.keyword.trim();
      if (invalidKeys.includes(keyword)) {
        keyword = previousValidStep;
      } else {
        previousValidStep = keyword;
      }
      steps.push({ title: step.text, keyword });
    }
    scenarioJson.line = start;
    scenarioJson.tags = scenario.tags.map(t => t.name.slice(1));
    scenarioJson.code = sourceArray.slice(start, end).join('\n');
    scenarioJson.steps = steps;
    scenarios.push(scenarioJson);
  };

  const handleRule = (rule) => {
    console.log(' - ', rule.name);
    endLocations.shift();
    inRule = true;
    rule.children.forEach(handleChild);
    inRule = false;
  };

  const handleChild = ({ scenario, rule }) => {
    if (scenario) handleScenario(scenario);
    if (rule) handleRule(rule);
  }

  feature.children.forEach(handleChild);

  return scenarios;
};

const parseFile = file => new Promise((resolve, reject) => {
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
      // \n is screened on windows, so let's check for ode_modules here
      if (!fileName.includes('ode_modules')) {
        console.log('___________________________\n');
        console.log(' 🗒️  File : ', fileName, '\n');
        if (data[1].gherkinDocument) {
          console.log('= ', data[1].gherkinDocument.feature.name);
          featureData.feature = getTitle(data[1].gherkinDocument.feature);
          if (!featureData.feature) {
            console.log(chalk.red('Title for feature is empty, skipping'));
            featureData.error = `${fileName} : Empty feature`;
          }
          featureData.line = getLocation({feature: data[1].gherkinDocument.feature}) + 1;
          featureData.tags = data[1].gherkinDocument.feature.tags.map(t => t.name.slice(1));
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

/**
 *
 * @param {String} filePattern
 * @param {String} dir
 */
const analyzeFeatureFiles = (filePattern, dir = '.', excludePattern) => {
  workDir = dir;

  console.log('\n 🗄️  Parsing files\n');

  const promise = new Promise((resolve) => {
    const promiseArray = [];
    
    // Use cwd option instead of changing process directory
    glob(filePattern, { cwd: dir }, (er, files) => {
      let filteredFiles = files;
      
      if (excludePattern) {
        const excludedFiles = glob.sync(excludePattern, { cwd: dir });
        filteredFiles = files.filter(file => !excludedFiles.includes(file));
        console.log('Excluded files:', excludedFiles);
      }

      for (const file of filteredFiles) {
        const fullPath = path.join(dir, file);
        const data = parseFile(fullPath);
        promiseArray.push(data);
      }

      const resultArray = Promise.all(promiseArray);
      resultArray.then(resolve);
    });
  });

  return promise;
};


module.exports = analyzeFeatureFiles;
