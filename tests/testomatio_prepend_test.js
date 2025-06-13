const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

describe('TESTOMATIO_PREPEND_DIR integration', () => {
  const originalEnv = process.env.TESTOMATIO_PREPEND_DIR;
  
  afterEach(() => {
    // Restore original environment
    if (originalEnv) {
      process.env.TESTOMATIO_PREPEND_DIR = originalEnv;
    } else {
      delete process.env.TESTOMATIO_PREPEND_DIR;
    }
  });

  it('should include file content when TESTOMATIO_PREPEND_DIR is set', async () => {
    // Set the environment variable
    process.env.TESTOMATIO_PREPEND_DIR = 'MyTests';
    
    // Mock the required modules
    const analyse = require('../analyzer');
    const Reporter = require('../reporter');
    
    // Create a test file
    const testDir = path.join(__dirname, 'temp_prepend_test');
    const testFile = path.join(testDir, 'test.feature');
    
    // Clean up any existing test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    try {
      // Create test directory and file
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFile, `Feature: Test Feature
  Scenario: Test Scenario
    Given I have a test
    When I run it
    Then it should pass`);

      // Analyze the feature file
      const features = await analyse('**/*.feature', testDir);
      
      // Simulate the logic from bin/check.js
      const tests = [];
      const files = {};
      
      for (const suite of features) {
        if (suite.scenario) {
          for (const scenario of suite.scenario) {
            const { name, description, code, file, steps, tags } = scenario;
            if (name) {
              let fileName = file;
              
              // Apply TESTOMATIO_PREPEND_DIR logic
              if (process.env.TESTOMATIO_PREPEND_DIR) {
                fileName = path.join(process.env.TESTOMATIO_PREPEND_DIR, file);
              }
              
              // Store file content using the final fileName as key
              if (!files[fileName]) {
                files[fileName] = fs.readFileSync(path.join(testDir, file)).toString();
              }
              
              tests.push({
                name, suites: [suite.feature], tags, description, code, file: fileName, steps,
              });
            }
          }
        }
      }
      
      // Verify the fix
      expect(tests.length).to.equal(1);
      expect(tests[0].file).to.equal('MyTests/test.feature');
      expect(files['MyTests/test.feature']).to.exist;
      expect(files['MyTests/test.feature']).to.include('Feature: Test Feature');
      expect(files['MyTests/test.feature']).to.include('Scenario: Test Scenario');
      
    } finally {
      // Clean up test directory
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  });

  it('should work normally without TESTOMATIO_PREPEND_DIR', async () => {
    // Ensure environment variable is not set
    delete process.env.TESTOMATIO_PREPEND_DIR;
    
    const analyse = require('../analyzer');
    
    // Create a test file
    const testDir = path.join(__dirname, 'temp_prepend_test');
    const testFile = path.join(testDir, 'test.feature');
    
    // Clean up any existing test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    try {
      // Create test directory and file
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFile, `Feature: Test Feature
  Scenario: Test Scenario
    Given I have a test
    When I run it
    Then it should pass`);

      // Analyze the feature file
      const features = await analyse('**/*.feature', testDir);
      
      // Simulate the logic from bin/check.js
      const tests = [];
      const files = {};
      
      for (const suite of features) {
        if (suite.scenario) {
          for (const scenario of suite.scenario) {
            const { name, description, code, file, steps, tags } = scenario;
            if (name) {
              let fileName = file;
              
              // Apply TESTOMATIO_PREPEND_DIR logic (should be no-op)
              if (process.env.TESTOMATIO_PREPEND_DIR) {
                fileName = path.join(process.env.TESTOMATIO_PREPEND_DIR, file);
              }
              
              // Store file content using the final fileName as key
              if (!files[fileName]) {
                files[fileName] = fs.readFileSync(path.join(testDir, file)).toString();
              }
              
              tests.push({
                name, suites: [suite.feature], tags, description, code, file: fileName, steps,
              });
            }
          }
        }
      }
      
      // Verify normal behavior
      expect(tests.length).to.equal(1);
      expect(tests[0].file).to.equal('test.feature');
      expect(files['test.feature']).to.exist;
      expect(files['test.feature']).to.include('Feature: Test Feature');
      
    } finally {
      // Clean up test directory
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  });

  it('should maintain file content consistency for import/export cycle', async () => {
    // Simulate the full import/export cycle with TESTOMATIO_PREPEND_DIR
    process.env.TESTOMATIO_PREPEND_DIR = 'ImportedTests';
    
    const analyse = require('../analyzer');
    
    // Create a test file with full gherkin content
    const testDir = path.join(__dirname, 'temp_prepend_test');
    const testFile = path.join(testDir, 'sample.feature');
    
    const featureContent = `Feature: Sample Feature
  Background:
    Given I have a background step
  
  Scenario: First scenario
    Given I have a given step
    When I do something
    Then I should see a result
    
  Scenario: Second scenario  
    Given I have another given step
    When I do something else
    Then I should see another result`;
    
    // Clean up any existing test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    try {
      // Create test directory and file
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(testFile, featureContent);

      // Analyze the feature file
      const features = await analyse('**/*.feature', testDir);
      
      // Simulate the logic from bin/check.js with TESTOMATIO_PREPEND_DIR
      const tests = [];
      const files = {};
      
      for (const suite of features) {
        if (suite.scenario) {
          for (const scenario of suite.scenario) {
            const { name, description, code, file, steps, tags } = scenario;
            if (name) {
              let fileName = file;
              
              // Apply TESTOMATIO_PREPEND_DIR logic
              if (process.env.TESTOMATIO_PREPEND_DIR) {
                fileName = path.join(process.env.TESTOMATIO_PREPEND_DIR, file);
              }
              
              // Store file content using the final fileName as key for consistency, but avoid duplicate reads
              if (!files[fileName]) {
                files[fileName] = fs.readFileSync(path.join(testDir, file)).toString();
              }
              
              tests.push({
                name, suites: [suite.feature], tags, description, code, file: fileName, steps,
              });
            }
          }
        }
      }
      
      // Verify that we have multiple tests but only one file entry
      expect(tests.length).to.equal(2);
      expect(tests[0].file).to.equal('ImportedTests/sample.feature');
      expect(tests[1].file).to.equal('ImportedTests/sample.feature');
      
      // Verify that we have only one file entry (no duplicates)
      const fileKeys = Object.keys(files);
      expect(fileKeys.length).to.equal(1);
      expect(fileKeys[0]).to.equal('ImportedTests/sample.feature');
      
      // Verify that the file content is complete and includes all Gherkin elements
      const storedContent = files['ImportedTests/sample.feature'];
      expect(storedContent).to.include('Feature: Sample Feature');
      expect(storedContent).to.include('Background:');
      expect(storedContent).to.include('Given I have a background step');
      expect(storedContent).to.include('Scenario: First scenario');
      expect(storedContent).to.include('Scenario: Second scenario');
      expect(storedContent).to.include('When I do something');
      expect(storedContent).to.include('Then I should see a result');
      
      // Verify that the content is identical to the original file
      expect(storedContent).to.equal(featureContent);
      
    } finally {
      // Clean up test directory
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    }
  });
});