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

const idMap = {
  tests: {
    'Search testomat in google': '@T11111',
    'Search testomat.io in google': '@T22222',
  },
  suites: {
    'Google search': '@S11111',
  },
};

const createTestFiles = (folderName) => {
  const targetPath = path.join(__dirname, '..', folderName);
  copyDir(path.join(__dirname, '..', 'example'), targetPath);
};

const cleanFiles = (folderName) => {
  const targetPath = path.join(__dirname, '..', folderName);
  fs.rmdirSync(targetPath, { recursive: true, force: true });
};

describe('Utils', () => {
  it('should add suite and test ids', async () => {

    createTestFiles('update_examples');
    const features = await analyse('**/valid*.feature', path.join(__dirname, '..', 'update_examples'));

    const files = util.updateFiles(features, idMap, path.join(__dirname, '..', 'update_examples'));
    const file1 = fs.readFileSync(path.join(process.cwd(), 'update_examples', 'features', 'valid_google.feature'), { encoding: 'utf8' });
    const file2 = fs.readFileSync(path.join(process.cwd(), 'update_examples', 'features', 'valid_sample.feature'), { encoding: 'utf8' });

    expect(files.length).to.equal(2);
    expect(file1).to.include('@S11111');
    expect(file1).to.include('@T11111');
    expect(file1).to.include('@T22222');
    expect(file2).not.to.include('@T11111');
    cleanFiles('update_examples');
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
    cleanFiles('clean_examples');
  });

  it('should clean suite and test ids unsafely', async () => {

    createTestFiles('unsafe_examples');
    const features = await analyse('**/valid*.feature', path.join(__dirname, '..', 'unsafe_examples'));
    util.updateFiles(features, idMap, path.join(__dirname, '..', 'unsafe_examples'));

    const updatedFeatures = await analyse('**/valid*.feature', path.join(__dirname, '..', 'unsafe_examples'));
    const files = util.cleanFiles(updatedFeatures, {}, path.join(__dirname, '..', 'unsafe_examples'), true);

    const file1 = fs.readFileSync(path.join(process.cwd(), 'unsafe_examples', 'features', 'valid_google.feature'), { encoding: 'utf8' });

    expect(files.length).to.equal(2);
    expect(file1).not.to.include('@S11111');
    expect(file1).not.to.include('@T11111');
    expect(file1).not.to.include('@T22222');
    expect(file1).not.to.include('@Txxxxx');
    //expect(file2).not.to.include('@T22222');
    cleanFiles('unsafe_examples');
  });
});
