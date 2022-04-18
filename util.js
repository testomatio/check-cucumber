const insertLine = require('insert-line');
const fs = require('fs');

const getSpace = (code) => {
  const line = code.split('\n')[0];
  return line.search(/\S/);
};

const getTitle = (name) => {
  return name.replace(/@([\w\d\-\(\)\.\,\*:]+)/g, '').trim();
}

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

const insertLineToFile = (file, line, opts = { at: 1, overwrite: false }) => {
  const fileContent = fs.readFileSync(file, 'utf8').toString();
  const lines = fileContent.split(/\r\n|\r|\n/g);
  lines.splice(opts.at - 1, opts.overwrite ? 1 : 0, line);
  fs.writeFileSync(file, lines.join("\n"));
}

function updateFiles(features, testomatioMap, workDir) {
  const files = [];
  for (const suite of features) {
    if (!suite.scenario) continue;
    if (!suite.scenario.length) continue;

    let lineInc = 0;
    const featureFile = `${workDir}/${suite.scenario[0].file}`;
    files.push(featureFile);

    const name = getTitle(suite.feature);
    if (!testomatioMap.suites[name]) continue;
    if (suite.tags.includes(testomatioMap.suites[name])) continue;
    if (suite.feature.includes(testomatioMap.suites[name])) continue;

    const id = testomatioMap.suites[name];
    const at = suite.line || 1;
    if (suite.tags.length) {
      const tags = suite.tags.map(t => '@' + t).filter(t => t !== id).join(' ')
      insertLineToFile(featureFile, `${tags} ${id}`, { overwrite: true, at });
    } else {
      insertLineToFile(featureFile, `${id}`, { at });
      lineInc = 1;
    }

    for (const scenario of suite.scenario) {
      const spaceCount = getSpace(scenario.code);
      const file = `${workDir}/${scenario.file}`;
      const name = getTitle(scenario.name);
      if (!testomatioMap.tests[name]) continue;
      if (scenario.tags.includes(testomatioMap.tests[name])) continue;
      if (scenario.name.includes(testomatioMap.tests[name])) continue;
      const id = testomatioMap.tests[name];

      if (scenario.tags.length) {
        const tags = scenario.tags.map(t => '@' + t).filter(t => t !== id).join(' ')
        insertLineToFile(file, `${' '.repeat(spaceCount)}${tags} ${id}`.padStart(spaceCount, ' '), { overwrite: true, at: scenario.line + 1 + lineInc });
      } else {
        insertLineToFile(file, `\n${' '.repeat(spaceCount)}${id}`.padStart(spaceCount, ' '), { overwrite: true, at: scenario.line + lineInc });
        lineInc += 1;
      }
      delete testomatioMap.tests[scenario.name];
    }
    delete testomatioMap.suites[suite.feature];

    // console.log(testomatioMap);


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

    if (!dangerous) {
      suiteIds.forEach(sid => fileContent = fileContent.replace(sid, ''))
      testIds.forEach(tid => fileContent = fileContent.replace(tid, ''))
    } else {
      fileContent = fileContent.replace(/\s@T([\w\d-]{8})/g, '');
      fileContent = fileContent.replace(/\s@S([\w\d-]{8})/g, '');
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
