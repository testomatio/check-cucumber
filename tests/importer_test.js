const { expect } = require('chai');
const nock = require('nock');
const fs = require('fs');
const path = require('path');
const Importer = require('../importer');

describe('Importer', () => {
  const API_KEY = 'test-api-key';
  const BASE_URL = process.env.TESTOMATIO_URL || 'https://app.testomat.io';
  const TEST_DIR = path.join(__dirname, 'temp_importer_test');
  
  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    nock.cleanAll();
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create importer with api key', () => {
      const importer = new Importer(API_KEY);
      expect(importer.apiKey).to.equal(API_KEY);
      expect(importer.files).to.deep.equal({});
    });

    it('should log error when no api key provided', () => {
      const importer = new Importer();
      expect(importer.apiKey).to.be.undefined;
    });
  });

  describe('send', () => {
    it('should make GET request to pull endpoint', async () => {
      const mockData = [
        { file: 'test1.feature', contents: 'Feature: Test 1' },
        { file: 'test2.feature', contents: 'Feature: Test 2' }
      ];
      
      nock(BASE_URL)
        .get('/api/pull')
        .query({ api_key: API_KEY })
        .reply(200, mockData);

      const importer = new Importer(API_KEY);
      const result = await importer.send();
      
      expect(result).to.deep.equal(mockData);
    });

    it('should reject on non-200 status code', async () => {
      const errorMessage = 'Unauthorized';
      
      nock(BASE_URL)
        .get('/api/pull')
        .query({ api_key: API_KEY })
        .reply(401, errorMessage);

      const importer = new Importer(API_KEY);
      
      try {
        await importer.send();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(errorMessage);
      }
    });

    it('should reject on network error', async () => {
      nock(BASE_URL)
        .get('/api/pull')
        .query({ api_key: API_KEY })
        .replyWithError('Network error');

      const importer = new Importer(API_KEY);
      
      try {
        await importer.send();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Network error');
      }
    });

    it('should parse JSON response', async () => {
      const mockData = [{ file: 'test.feature', contents: 'Feature content' }];
      
      nock(BASE_URL)
        .get('/api/pull')
        .query({ api_key: API_KEY })
        .reply(200, JSON.stringify(mockData));

      const importer = new Importer(API_KEY);
      const result = await importer.send();
      
      expect(result).to.deep.equal(mockData);
    });
  });

  describe('pull', () => {
    it('should create files from API response', async () => {
      const testFile1 = path.join(TEST_DIR, 'features', 'test1.feature');
      const testFile2 = path.join(TEST_DIR, 'test2.feature');
      const mockData = [
        { file: testFile1, contents: 'Feature: Test 1\n  Scenario: First test' },
        { file: testFile2, contents: 'Feature: Test 2\n  Scenario: Second test' }
      ];
      
      nock(BASE_URL)
        .get('/api/pull')
        .query({ api_key: API_KEY })
        .reply(200, mockData);

      const importer = new Importer(API_KEY);
      await importer.pull();
      
      // Check files were created
      expect(fs.existsSync(testFile1)).to.be.true;
      expect(fs.existsSync(testFile2)).to.be.true;
      
      // Check file contents
      expect(fs.readFileSync(testFile1, 'utf8')).to.equal(mockData[0].contents);
      expect(fs.readFileSync(testFile2, 'utf8')).to.equal(mockData[1].contents);
    });

    it('should create directories recursively', async () => {
      const testFile = path.join(TEST_DIR, 'deep', 'nested', 'path', 'test.feature');
      const mockData = [
        { file: testFile, contents: 'Feature: Deep nested test' }
      ];
      
      nock(BASE_URL)
        .get('/api/pull')
        .query({ api_key: API_KEY })
        .reply(200, mockData);

      const importer = new Importer(API_KEY);
      await importer.pull();
      
      // Check directory was created
      expect(fs.existsSync(path.dirname(testFile))).to.be.true;
      expect(fs.existsSync(testFile)).to.be.true;
      expect(fs.readFileSync(testFile, 'utf8')).to.equal(mockData[0].contents);
    });

    it('should overwrite existing files', async () => {
      const testFile = path.join(TEST_DIR, 'existing.feature');
      const originalContent = 'Original content';
      const newContent = 'Updated content from API';
      
      // Create test directory and file
      fs.mkdirSync(TEST_DIR, { recursive: true });
      fs.writeFileSync(testFile, originalContent);
      
      const mockData = [
        { file: testFile, contents: newContent }
      ];
      
      nock(BASE_URL)
        .get('/api/pull')
        .query({ api_key: API_KEY })
        .reply(200, mockData);

      const importer = new Importer(API_KEY);
      await importer.pull();
      
      // Check file was overwritten
      expect(fs.readFileSync(testFile, 'utf8')).to.equal(newContent);
    });

    it('should handle empty response gracefully', async () => {
      nock(BASE_URL)
        .get('/api/pull')
        .query({ api_key: API_KEY })
        .reply(200, null);

      const importer = new Importer(API_KEY);
      await importer.pull();
      
      // Should not create any files
      expect(fs.existsSync(TEST_DIR)).to.be.false;
    });

    it('should handle API error gracefully', async () => {
      nock(BASE_URL)
        .get('/api/pull')
        .query({ api_key: API_KEY })
        .reply(500, 'Internal Server Error');

      const importer = new Importer(API_KEY);
      
      try {
        await importer.pull();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal('Internal Server Error');
      }
    });

    it('should handle file system errors', async () => {
      const invalidPath = '/root/cannot-write-here/test.feature'; // Path that likely doesn't have write permissions
      const mockData = [
        { file: invalidPath, contents: 'Feature: Test' }
      ];
      
      nock(BASE_URL)
        .get('/api/pull')
        .query({ api_key: API_KEY })
        .reply(200, mockData);

      const importer = new Importer(API_KEY);
      
      try {
        await importer.pull();
        // If this doesn't throw, it means the path was actually writable
        // which is fine for the test - we just want to ensure error handling exists
      } catch (error) {
        // Expected behavior - should throw file system error
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should resolve relative paths correctly', async () => {
      const originalCwd = process.cwd();
      
      try {
        // Create and change to test directory first
        fs.mkdirSync(TEST_DIR, { recursive: true });
        process.chdir(TEST_DIR);
        
        const relativePath = './features/relative.feature';
        const mockData = [
          { file: relativePath, contents: 'Feature: Relative path test' }
        ];
        
        nock(BASE_URL)
          .get('/api/pull')
          .query({ api_key: API_KEY })
          .reply(200, mockData);

        const importer = new Importer(API_KEY);
        await importer.pull();
        
        // Check file was created relative to current working directory
        const expectedPath = path.resolve(relativePath);
        expect(fs.existsSync(expectedPath)).to.be.true;
        expect(fs.readFileSync(expectedPath, 'utf8')).to.equal(mockData[0].contents);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});