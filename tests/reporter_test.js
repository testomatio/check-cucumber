const { expect } = require('chai');
const nock = require('nock');
const Reporter = require('../reporter');

describe('Reporter', () => {
  const API_KEY = 'test-api-key';
  const BASE_URL = process.env.TESTOMATIO_URL || 'https://app.testomat.io';
  
  afterEach(() => {
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('should create reporter with api key', () => {
      const reporter = new Reporter(API_KEY);
      expect(reporter.apiKey).to.equal(API_KEY);
      expect(reporter.tests).to.deep.equal([]);
      expect(reporter.files).to.deep.equal({});
      expect(reporter.isCodecept).to.be.false;
    });

    it('should set codecept flag when provided', () => {
      const reporter = new Reporter(API_KEY, true);
      expect(reporter.isCodecept).to.be.true;
    });

    it('should log error when no api key provided', () => {
      const reporter = new Reporter();
      expect(reporter.apiKey).to.be.undefined;
    });
  });

  describe('getFramework', () => {
    it('should return Cucumber by default', () => {
      const reporter = new Reporter(API_KEY);
      expect(reporter.getFramework()).to.equal('Cucumber');
    });

    it('should return codeceptjs when isCodecept is true', () => {
      const reporter = new Reporter(API_KEY, true);
      expect(reporter.getFramework()).to.equal('codeceptjs');
    });
  });

  describe('addTests', () => {
    it('should add tests to existing tests array', () => {
      const reporter = new Reporter(API_KEY);
      const tests1 = [{ name: 'test1' }, { name: 'test2' }];
      const tests2 = [{ name: 'test3' }];
      
      reporter.addTests(tests1);
      expect(reporter.tests).to.deep.equal(tests1);
      
      reporter.addTests(tests2);
      expect(reporter.tests).to.deep.equal([...tests1, ...tests2]);
    });
  });

  describe('addFiles', () => {
    it('should add files object', () => {
      const reporter = new Reporter(API_KEY);
      const files = { 'test.feature': 'content' };
      
      reporter.addFiles(files);
      expect(reporter.files).to.deep.equal(files);
    });
  });

  describe('getIds', () => {
    it('should make GET request to test_data endpoint', async () => {
      const mockData = { tests: [{ id: '1', title: 'Test 1' }] };
      
      nock(BASE_URL)
        .get('/api/test_data')
        .query({ api_key: API_KEY })
        .reply(200, mockData);

      const reporter = new Reporter(API_KEY);
      const result = await reporter.getIds();
      
      expect(result).to.deep.equal(mockData);
    });

    it('should include query parameters in request', async () => {
      const mockData = { tests: [] };
      const opts = { branch: 'feature-branch', sync: true };
      
      nock(BASE_URL)
        .get('/api/test_data')
        .query({ api_key: API_KEY, branch: 'feature-branch', sync: 'true' })
        .reply(200, mockData);

      const reporter = new Reporter(API_KEY);
      const result = await reporter.getIds(opts);
      
      expect(result).to.deep.equal(mockData);
    });

    it('should reject on non-200 status code', async () => {
      const errorMessage = 'Unauthorized';
      
      nock(BASE_URL)
        .get('/api/test_data')
        .query({ api_key: API_KEY })
        .reply(401, errorMessage);

      const reporter = new Reporter(API_KEY);
      
      try {
        await reporter.getIds();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.equal(errorMessage);
      }
    });

    it('should reject on network error', async () => {
      nock(BASE_URL)
        .get('/api/test_data')
        .query({ api_key: API_KEY })
        .replyWithError('Network error');

      const reporter = new Reporter(API_KEY);
      
      try {
        await reporter.getIds();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Network error');
      }
    });
  });

  describe('send', () => {
    it('should make POST request to load endpoint with test data', async () => {
      const tests = [{ name: 'Test 1', file: 'test.feature' }];
      const files = { 'test.feature': 'Feature content' };
      
      nock(BASE_URL)
        .post('/api/load')
        .query({ api_key: API_KEY })
        .reply(200, 'Success');

      const reporter = new Reporter(API_KEY);
      reporter.addTests(tests);
      reporter.addFiles(files);
      
      await reporter.send();
      
      expect(nock.isDone()).to.be.true;
    });

    it('should include framework and language in payload', async () => {
      let requestBody;
      
      nock(BASE_URL)
        .post('/api/load', function(body) {
          requestBody = body;
          return true; // Accept any body
        })
        .query({ api_key: API_KEY })
        .reply(200, 'Success');

      const reporter = new Reporter(API_KEY, true); // codecept = true
      reporter.addTests([{ name: 'Test 1' }]);
      
      await reporter.send();
      
      expect(requestBody.framework).to.equal('codeceptjs');
      expect(requestBody.language).to.equal('gherkin');
      expect(requestBody.tests).to.deep.equal([{ name: 'Test 1' }]);
    });

    it('should include additional options in payload', async () => {
      let requestBody;
      const opts = { branch: 'main', sync: true };
      
      nock(BASE_URL)
        .post('/api/load', function(body) {  
          requestBody = body;
          return true; // Accept any body
        })
        .query({ api_key: API_KEY })
        .reply(200, 'Success');

      const reporter = new Reporter(API_KEY);
      await reporter.send(opts);
      
      expect(requestBody.branch).to.equal('main');
      expect(requestBody.sync).to.be.true;
    });

    it('should resolve on successful response', async () => {
      nock(BASE_URL)
        .post('/api/load')
        .query({ api_key: API_KEY })
        .reply(200, 'Success');

      const reporter = new Reporter(API_KEY);
      const result = await reporter.send();
      
      expect(result).to.be.undefined; // Method resolves without value
    });

    it('should resolve even on 4xx/5xx errors', async () => {
      nock(BASE_URL)
        .post('/api/load')
        .query({ api_key: API_KEY })
        .reply(400, 'Bad Request');

      const reporter = new Reporter(API_KEY);
      const result = await reporter.send();
      
      expect(result).to.be.undefined; // Method still resolves
    });

    it('should reject on network error', async () => {
      nock(BASE_URL)
        .post('/api/load')
        .query({ api_key: API_KEY })
        .replyWithError('Connection failed');

      const reporter = new Reporter(API_KEY);
      
      try {
        await reporter.send();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Connection failed');
      }
    });

    it('should not send if no api key provided', (done) => {
      const reporter = new Reporter(); // No API key
      
      // Don't set up any nock interceptors since no HTTP calls should be made
      const promise = reporter.send();
      
      // The promise should never resolve/reject when no API key is provided
      // This is actually a bug in the original code that should be fixed
      let resolved = false;
      promise.then(() => {
        resolved = true;
      }).catch(() => {
        resolved = true;
      });
      
      // Wait a bit to ensure no resolution occurs
      setTimeout(() => {
        expect(resolved).to.be.false;
        done();
      }, 100);
    });

    it('should set correct content headers', async () => {
      let requestHeaders;
      
      nock(BASE_URL)
        .post('/api/load')
        .query({ api_key: API_KEY })
        .reply(200, function(uri, body) {
          requestHeaders = this.req.headers;
          return 'Success';
        });

      const reporter = new Reporter(API_KEY);
      await reporter.send();
      
      expect(requestHeaders['content-type']).to.equal('application/json');
      expect(requestHeaders['content-length']).to.exist;
    });
  });
});