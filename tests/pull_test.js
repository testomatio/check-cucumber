const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const Pull = require('../pull');

describe('Pull', () => {
  let mockReporter;
  let pull;
  const testDir = path.join(__dirname, 'temp-pull');

  beforeEach(() => {
    // Clean and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create mock reporter
    mockReporter = {
      getFilesFromServer: () =>
        Promise.resolve({
          files: {
            'login.feature': `@S12345678
Feature: User Login

  @T87654321 @smoke
  Scenario: Valid login
    Given I am on the login page
    When I enter valid credentials
    Then I should be logged in`,
            'admin/user-management.feature': `@S87654322
Feature: User Management

  @T87654323
  Scenario: Create user
    Given I am an admin
    When I create a new user
    Then the user should be created`
          }
        })
    };

    pull = new Pull(mockReporter, testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('execute', () => {
    it('should create .feature files from server response', async () => {
      await pull.execute();

      const loginFile = path.join(testDir, 'login.feature');
      const adminFile = path.join(testDir, 'admin/user-management.feature');

      expect(fs.existsSync(loginFile)).to.be.true;
      expect(fs.existsSync(adminFile)).to.be.true;

      const loginContent = fs.readFileSync(loginFile, 'utf8');
      expect(loginContent).to.include('@S12345678');
      expect(loginContent).to.include('Feature: User Login');
      expect(loginContent).to.include('@T87654321');
      expect(loginContent).to.include('@smoke');
      expect(loginContent).to.include('Scenario: Valid login');

      const adminContent = fs.readFileSync(adminFile, 'utf8');
      expect(adminContent).to.include('@S87654322');
      expect(adminContent).to.include('Feature: User Management');
      expect(adminContent).to.include('@T87654323');
      expect(adminContent).to.include('Scenario: Create user');
    });

    it('should create nested directories as needed', async () => {
      mockReporter.getFilesFromServer = () =>
        Promise.resolve({
          files: {
            'deep/nested/path/test.feature': `Feature: Deep Test
  Scenario: Test scenario
    Given something`
          }
        });

      await pull.execute();

      const deepFile = path.join(testDir, 'deep/nested/path/test.feature');
      expect(fs.existsSync(deepFile)).to.be.true;

      const content = fs.readFileSync(deepFile, 'utf8');
      expect(content).to.include('Feature: Deep Test');
    });

    it('should handle empty server response', async () => {
      mockReporter.getFilesFromServer = () => Promise.resolve({ files: {} });

      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (...args) => {
        consoleOutput += args.join(' ') + '\n';
      };

      await pull.execute();

      console.log = originalLog;

      expect(consoleOutput).to.include('Successfully pulled 0 files');
    });

    it('should handle server returning no files property', async () => {
      mockReporter.getFilesFromServer = () => Promise.resolve({});

      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (...args) => {
        consoleOutput += args.join(' ') + '\n';
      };

      await pull.execute();

      console.log = originalLog;

      expect(consoleOutput).to.include('No files found on server');
    });

    it('should support dry run mode', async () => {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (...args) => {
        consoleOutput += args.join(' ') + '\n';
      };

      await pull.execute({ dryRun: true });

      console.log = originalLog;

      // Files should not be created in dry run
      const loginFile = path.join(testDir, 'login.feature');
      expect(fs.existsSync(loginFile)).to.be.false;

      // But should show what would be created
      expect(consoleOutput).to.include('Would create: login.feature');
      expect(consoleOutput).to.include('Would create: admin/user-management.feature');
      expect(consoleOutput).to.include('Dry run completed');
    });


    it('should handle server errors gracefully', async () => {
      mockReporter.getFilesFromServer = () =>
        Promise.reject(new Error('Server unavailable'));

      try {
        await pull.execute();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Server unavailable');
      }
    });

    it('should overwrite existing files', async () => {
      // Create an existing file
      const existingFile = path.join(testDir, 'login.feature');
      fs.writeFileSync(existingFile, 'Old content');

      await pull.execute();

      const content = fs.readFileSync(existingFile, 'utf8');
      expect(content).to.include('Feature: User Login');
      expect(content).to.not.include('Old content');
    });
  });
});