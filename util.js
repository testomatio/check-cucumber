const insertLine = require('insert-line');

const getSpace = (code) => {
  const line = code.split('\n')[0];
  return line.search(/\S/);
};

async function updateFiles(features, testomatioMap, workDir) {
  for (const suite of features) {
    let lineInc = 0;
    const featureFile = `${workDir}/${suite.scenario[0].file}`;
    if (testomatioMap.suites[suite.feature] && !suite.feature.includes(testomatioMap.suites[suite.feature])) {
      insertLine(featureFile).contentSync(`${testomatioMap.suites[suite.feature]}`, { overwrite: false }).at(1);
      lineInc = 1;
    }
    for (const scenario of suite.scenario) {
      const spaceCount = getSpace(scenario.code);
      const file = `${workDir}/${scenario.file}`;
      if (testomatioMap.tests[scenario.name] && !scenario.name.includes(testomatioMap.tests[scenario.name])) {
        insertLine(file).contentSync(`\n${' '.repeat(spaceCount)}${testomatioMap.tests[scenario.name]}`.padStart(spaceCount, ' '), { overwrite: true }).at(scenario.line + lineInc);
        lineInc += 1;
      }
    }
  }
}

module.exports = {
  updateFiles,
};
