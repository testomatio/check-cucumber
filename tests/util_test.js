const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const analyse = require('../analyzer');
const util = require('../util');

const copyDir = (src, dest) => {
  try {
    fs.mkdirSync(dest, 0755);
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
  const files = fs.readdirSync(src);
  for (let i = 0; i < files.length; i++) {
    const current = fs.lstatSync(path.join(src, files[i]));
    if (current.isDirectory()) {
      copyDir(path.join(src, files[i]), path.join(dest, files[i]));
    } else if (current.isSymbolicLink()) {
      const symlink = fs.readlinkSync(path.join(src, files[i]));
      fs.symlinkSync(symlink, path.join(dest, files[i]));
    } else {
      fs.copyFileSync(path.join(src, files[i]), path.join(dest, files[i]));
    }
  }
};

let idMap = {}

const createTestFiles = (folderName) => {
  const targetPath = path.join(__dirname, '..', folderName);
  copyDir(path.join(__dirname, '..', 'example'), targetPath);
};

const cleanFiles = (folderName) => {
  const targetPath = path.join(__dirname, '..', folderName);
  fs.rmSync(targetPath, { recursive: true, force: true });
};

describe('Utils', () => {

  beforeEach(() => {
    idMap = {
      tests: {
        'Search testomat in google': '@notrelev',
        'Google search#Search testomat in google': '@Ta6f544c0',
        'Search testomat.io in google': '@T40257bf0',
        'Chat 1': '@T40257bf1',
        'Chat 2': '@T40257bf2',
        'Chat 3': '@T40257bf3',
      },
      suites: {
        'Google search': '@S12345678',
        'Chat page - Performer status': '@S12345679',
      },
    }
  });

  afterEach(() => {
    try {
      cleanFiles('update_examples');
      cleanFiles('clean_examples');
      cleanFiles('unsafe_examples');
      cleanFiles('tags_examples');
    } catch (err) {}
  });

  it('should add suite and test ids', async () => {

    createTestFiles('update_examples');
    const features = await analyse('**/valid*.feature', path.join(__dirname, '..', 'update_examples'));
    const files = util.updateFiles(features, idMap, path.join(__dirname, '..', 'update_examples'));

    const updatedFeatures = await analyse('**/valid*.feature', path.join(__dirname, '..', 'update_examples'));
    expect(updatedFeatures[0].error).to.equal(undefined);
    expect(updatedFeatures[1].error).to.equal(undefined);

    const file1 = fs.readFileSync(path.join(process.cwd(), 'update_examples', 'features', 'valid_google.feature'), { encoding: 'utf8' });
    const file2 = fs.readFileSync(path.join(process.cwd(), 'update_examples', 'features', 'valid_sample.feature'), { encoding: 'utf8' });

    expect(files.length).to.equal(2);
    expect(file1).to.include('@S12345678');
    expect(file1).to.include('@Ta6f544c0');
    expect(file1).to.include('@T40257bf0');
    expect(file2).not.to.include('@T11111');
  });

  it('should update tags for suite and test ids', async () => {
    createTestFiles('update_examples');
    const features = await analyse('**/tags.feature', path.join(__dirname, '..', 'update_examples'));
    const files = util.updateFiles(features, idMap, path.join(__dirname, '..', 'update_examples'));

    const updatedFeatures = await analyse('**/tags.feature', path.join(__dirname, '..', 'update_examples'));
    expect(updatedFeatures[0].error).to.equal(undefined);

    const file1 = fs.readFileSync(path.join(process.cwd(), 'update_examples', 'features', 'tags.feature'), { encoding: 'utf8' });

    expect(files.length).to.equal(1);
    expect(file1).to.include('@S12345679');
    expect(file1).to.include('@T40257bf1');
    expect(file1).to.include('@T40257bf2');
    expect(file1).to.include('@T40257bf3');
  });

  it('should update multiline tags for suite and test ids', async () => {
    createTestFiles('update_examples');
    const features = await analyse('**/tags2.feature', path.join(__dirname, '..', 'update_examples'));
    const files = util.updateFiles(features, idMap, path.join(__dirname, '..', 'update_examples'));

    const updatedFeatures = await analyse('**/tags2.feature', path.join(__dirname, '..', 'update_examples'));
    expect(updatedFeatures[0].error).to.equal(undefined);

    const file1 = fs.readFileSync(path.join(process.cwd(), 'update_examples', 'features', 'tags2.feature'), { encoding: 'utf8' });

    const tagsToNotDuplicate = ["@feature:chatPage", "@Severity:critical", "@slow", "@important"];

    for (const stringToCheck of tagsToNotDuplicate) {
      const regex = new RegExp(stringToCheck, 'g');
      const matches = file1.match(regex) || [];
      expect(matches).to.have.lengthOf(1, `${stringToCheck} should appear exactly once`);
    }    
    const regex = new RegExp('@story:performerStatus', 'g');
    const matches = file1.match(regex) || [];
    expect(matches).to.have.lengthOf(3);

    expect(files.length).to.equal(1);
    expect(file1).to.include('@S12345679');
    expect(file1).to.include('@T40257bf1');
    expect(file1).to.include('@T40257bf2');
    expect(file1).to.include('@T40257bf3');
  });


  it('should not duplicate add suite and test ids', async () => {

    createTestFiles('update_examples');
    const features = await analyse('**/valid*.feature', path.join(__dirname, '..', 'update_examples'));

    const files = util.updateFiles(features, idMap, path.join(__dirname, '..', 'update_examples'));
    const file1 = fs.readFileSync(path.join(process.cwd(), 'update_examples', 'features', 'valid_google.feature'), { encoding: 'utf8' });

    expect(files.length).to.equal(2);
    expect(file1).not.to.include('@S12345678 @S12345678');
    expect(file1).to.include('@Ta6f544c0');
    expect(file1).not.to.include('@Ta6f544c0 @Ta6f544c0');
    expect(file1).to.include('@T40257bf0');
  });

  it('should clean suite and test ids safely', async () => {

    createTestFiles('clean_examples');
    const features = await analyse('**/valid*.feature', path.join(__dirname, '..', 'clean_examples'));
    util.updateFiles(features, idMap, path.join(__dirname, '..', 'clean_examples'));

    const updatedFeatures = await analyse('**/valid*.feature', path.join(__dirname, '..', 'clean_examples'));
    const files = util.cleanFiles(updatedFeatures, idMap, path.join(__dirname, '..', 'clean_examples'));

    const file1 = fs.readFileSync(path.join(process.cwd(), 'clean_examples', 'features', 'valid_google.feature'), { encoding: 'utf8' });

    expect(files.length).to.equal(2);
    expect(file1).not.to.include('@S11111');
    expect(file1).not.to.include('@T11111');
    expect(file1).not.to.include('@T22222');
    expect(file1).to.include('@Txxxxx');
    //expect(file2).not.to.include('@T22222');
  });

  it('should clean suite and test ids unsafely', async () => {
    createTestFiles('unsafe_examples');
    const features = await analyse('**/valid*.feature', path.join(__dirname, '..', 'unsafe_examples'));
    util.updateFiles(features, idMap, path.join(__dirname, '..', 'unsafe_examples'));

    const updatedFeatures = await analyse('**/valid*.feature', path.join(__dirname, '..', 'unsafe_examples'));
    expect(updatedFeatures[0].error).to.equal(undefined);
    expect(updatedFeatures[1].error).to.equal(undefined);

    const files = util.cleanFiles(updatedFeatures, {}, path.join(__dirname, '..', 'unsafe_examples'), true);

    const file1 = fs.readFileSync(path.join(process.cwd(), 'unsafe_examples', 'features', 'valid_google.feature'), { encoding: 'utf8' });

    expect(files.length).to.equal(2);
    expect(file1).not.to.include('@S1233456');
    expect(file1).not.to.include('@T40257bf0');
    expect(file1).not.to.include('@T4d7f20ed');
    expect(file1).not.to.include('@T4d7f20ed');
    //expect(file2).not.to.include('@T22222');
  });

  it('should check for suite and test ids', async () => {
    const workDir = path.join(__dirname, '..', 'example/features');
    const features = await analyse('**/valid_sample.feature', workDir);
    const { checkedFiles, suitesWithoutIds, testsWithoutIds } = util.checkFiles(
      features,
      workDir
    );

    expect(features.length).equal(1);
    expect(checkedFiles).deep.equal([
      path.join(workDir, 'valid_sample.feature')
    ]);
    expect(suitesWithoutIds).deep.equal([
      'Business rules'
    ]);
    expect(testsWithoutIds).deep.equal([
      'do something',
      'do something twice',
      'Search testomat in google'
    ]);
  });

  it('should clean suite and test ids with non-standard tags', async () => {
    createTestFiles('tags_examples');
    const tagIdMap = {
      tests: {
        'Create Todos with BDD': '@T40257bf0',
        'Create a single todo item': '@T40257bf1',
        'Create multiple todos': '@T40257bf3',
      },
      suites: {
        'Create Todos with BDD': '@S12345678',
      },
    }

    const file0 = fs.readFileSync(path.join(process.cwd(), 'tags_examples', 'features', 'tags3.feature'), { encoding: 'utf8' });

    const features = await analyse('**/tags3.feature', path.join(__dirname, '..', 'tags_examples'));
    util.updateFiles(features, tagIdMap, path.join(__dirname, '..', 'tags_examples'));
    
    const file1 = fs.readFileSync(path.join(process.cwd(), 'tags_examples', 'features', 'tags3.feature'), { encoding: 'utf8' });

    expect(file1).to.include('@some-tag @priority-example @some_context-drop @T40257bf1');
    expect(file1).to.include('@some-tag @priority-example @T40257bf3');


    const updatedFeatures = await analyse('**/tags3.feature', path.join(__dirname, '..', 'tags_examples'));
    const files = util.cleanFiles(updatedFeatures, {}, path.join(__dirname, '..', 'tags_examples'), true);
    
    const file2 = fs.readFileSync(path.join(process.cwd(), 'tags_examples', 'features', 'tags3.feature'), { encoding: 'utf8' });

    expect(file2).to.not.include('@T40257bf1');
    expect(file2).to.include('@some-tag @priority-example @some_context-drop');

    expect(file2.trim()).to.eql(file0.trim())
    //expect(file2).not.to.include('@T22222');
  });

});
