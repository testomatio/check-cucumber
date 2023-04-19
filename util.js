const insertLine = require('insert-line');
const fs = require('fs');

const getSpace = (code) => {
  const lines = code.split('\n');
  let line = lines[0];
  if (lines[1] && lines[0].trim().startsWith('@')) line = lines[1];
  return line.search(/\S|$/);
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

const getLine = (file, line) => {
  const fileContent = fs.readFileSync(file, 'utf8').toString();
  const lines = fileContent.split(/\r\n|\r|\n/g);
  return lines[line];  
}

function updateFiles(features, testomatioMap, workDir) {
  const files = [];

  let hasOtherIds = false;

  for (const suite of features) {
    if (!suite.scenario) continue;
    if (!suite.scenario.length) continue;
    
    let lineInc = 0;
    const featureFile = `${workDir}/${suite.scenario[0].file}`;
    files.push(featureFile);
    
    const suiteName = getTitle(suite.feature);
    const fileName = suite.scenario[0].file;
    
    let needsSuiteUpdate = true;
    if (!testomatioMap.suites[suiteName]) needsSuiteUpdate = false;
    if (suite.tags.includes(testomatioMap.suites[suiteName])) needsSuiteUpdate = false;
    if (suite.feature.includes(testomatioMap.suites[suiteName])) needsSuiteUpdate = false;

    if (needsSuiteUpdate) {
      let id = testomatioMap.suites[suiteName];
      if (testomatioMap.suites[`${fileName}#${suiteName}`]) id = testomatioMap.suites[`${fileName}#${suiteName}`];
            
      const at = suite.line || 1;
      if (suite.tags.length) {
        const hasId = suite.tags.map(t => '@' + t).find(t => t === id);
        if (hasId) continue;
        if (suite.tags.find(t => t.match(/@S([\w\d-]{8})/))) {
          hasOtherIds = true;
          continue;
        }
        const tags = getLine(featureFile, at - 1).split(' ').filter(v => v.startsWith('@'))
        insertLineToFile(featureFile, `${tags.join(' ')} ${id}`, { overwrite: true, at });
      } else {
        insertLineToFile(featureFile, `${id}`, { at });
        lineInc = 1;
      }
    }

    for (const scenario of suite.scenario) {
      const spaceCount = getSpace(scenario.code);
      const file = `${workDir}/${scenario.file}`;
      const name = getTitle(scenario.name);
      if (!testomatioMap.tests[name]) continue;
      if (scenario.tags.includes(testomatioMap.tests[name])) continue;
      if (scenario.name.includes(testomatioMap.tests[name])) continue;
      let id = testomatioMap.tests[name];

      if (testomatioMap.tests[`${suiteName}#${name}`]) id = testomatioMap.tests[`${suiteName}#${name}`];
      if (testomatioMap.tests[`${fileName}#${suiteName}#${name}`]) id = testomatioMap.tests[`${fileName}#${suiteName}#${name}`];

      if (scenario.tags.length) {
        const hasId = scenario.tags.map(t => '@' + t).find(t => t === id);
        if (hasId) continue;
        if (suite.tags.find(t => t.match(/@S([\w\d-]{8})/))) {
          hasOtherIds = true;
          continue;
        }
        const at = scenario.line + 1 + lineInc;
        const prevLine = getLine(file, at - 1)
        const tags = prevLine.split(' ').filter(v => v.startsWith('@'))
        insertLineToFile(file, ' '.repeat(spaceCount) + (`${tags.join(' ')} ${id}`.trim()), { overwrite: true, at });
      } else {
        insertLineToFile(file, `\n${' '.repeat(spaceCount)}${id}`, { overwrite: true, at: scenario.line + lineInc });
        lineInc += 1;
      }
    }
  }

  if (hasOtherIds) console.log('WARNING: Some tests have IDs from another project. New IDs were ignored. Clean up old IDs with --clean-ids and re-run this command again.');

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
      /*
      Suite and test ids are always added with a new line,
      therefore, when we want to remove ids - the whole line shold be removed.
      The regex below includes:
      1. [ \t]* – unlimited amount of spaces or tabs
      2. suite or test id (sid/tid)
      2. \\s - new line (or other whitespace characters)
      */
      suiteIds.forEach(sid => fileContent = fileContent.replace(new RegExp('[ \\t]*' + sid + '\\s'), ''))
      testIds.forEach(tid => fileContent = fileContent.replace(new RegExp('[ \\t]*' + tid + '\\s'), ''))
    } else {
      fileContent = fileContent.replace(/[ \t]*@S([\w\d-]{8})\s/g, '');
      fileContent = fileContent.replace(/[ \t]*@T([\w\d-]{8})\s/g, '');
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
