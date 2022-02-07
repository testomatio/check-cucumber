const insertLine = require('insert-line');
const fs = require('fs');

const getSpace = (code) => {
  const line = code.split('\n')[0];
  return line.search(/\S/);
};

const parseTest = testTitle => {
  const captures = testTitle.match(/@T([\w\d]+)/);
  if (captures) {
    return captures[1];
  }

  return null;
};

const parseSuite = suiteTitle => {
  const captures = suiteTitle.match(/@S([\w\d]+)/);
  if (captures) {
    return captures[1];
  }

  return null;
};

function updateFiles(features, testomatioMap, workDir) {
  const files = [];
  for (const suite of features) {
    if (!suite.scenario) continue;
    if (!suite.scenario.length) continue;

    let lineInc = 0;
    const featureFile = `${workDir}/${suite.scenario[0].file}`;
    if (testomatioMap.suites[suite.feature] && !suite.feature.includes(testomatioMap.suites[suite.feature])) {
      insertLine(featureFile).contentSync(`${testomatioMap.suites[suite.feature]}`, { overwrite: false }).at(1);
      lineInc = 1;
      delete testomatioMap.suites[suite.feature];
    }
    for (const scenario of suite.scenario) {
      const spaceCount = getSpace(scenario.code);
      const file = `${workDir}/${scenario.file}`;
      if (testomatioMap.tests[scenario.name] && !scenario.name.includes(testomatioMap.tests[scenario.name])) {
        insertLine(file).contentSync(`\n${' '.repeat(spaceCount)}${testomatioMap.tests[scenario.name]}`.padStart(spaceCount, ' '), { overwrite: true }).at(scenario.line + lineInc);
        lineInc += 1;
        delete testomatioMap.tests[scenario.name];
      }
    }

    files.push(featureFile);
  }

  return files;
}

function cleanFiles(features, testomatioMap = {}, workDir, dangerous = false) {
  const testIds = testomatioMap.tests ? Object.values(testomatioMap.tests) : [];
  const suiteIds = testomatioMap.suites ? Object.values(testomatioMap.suites) : [];
  const files = [];
  for (const suite of features) {
    if (!suite) continue;
    if (!suite.scenario) continue;
    if (!suite.scenario.length) continue;

    const file = `${workDir}/${suite.scenario[0].file}`;
    let fileContent = fs.readFileSync(file, { encoding: 'utf8' });
    const suiteTitle = suite.feature;
    const suiteId = `@S${parseSuite(suiteTitle)}`;
    if (suiteIds.includes(suiteId) || (dangerous && suiteId)) {
      fileContent = fileContent.replace(suiteId, '');
    }
    for (const scenario of suite.scenario) {
      const testId = `@T${parseTest(scenario.name)}`;
      if (testIds.includes(testId) || (dangerous && testId)) {
        fileContent = fileContent.replace(testId, '');
      }
    }
    files.push(file);
    fs.writeFileSync(file, fileContent, (err) => {
      if (err) throw err;
    });
  }
  return files;
}
module.exports = {
  updateFiles,
  cleanFiles,
};
