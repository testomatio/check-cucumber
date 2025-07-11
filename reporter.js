const URL = process.env.TESTOMATIO_URL || 'https://app.testomat.io';
const isHttps = URL.startsWith('https');
const { request } = isHttps ? require('https') : require('http');

class Reporter {
  constructor(apiKey, isCodecept) {
    if (!apiKey) {
      console.error('✖️  Cant send report, api key not set');
    }
    this.apiKey = apiKey;
    this.tests = [];
    this.files = {};
    this.isCodecept = !!isCodecept;
  }

  addTests(tests) {
    this.tests = this.tests.concat(tests);
  }

  addFiles(files) {
    this.files = files;
  }

  parseLabels(labelsString) {
    if (!labelsString) return [];

    return labelsString
      .split(',')
      .map(label => label.trim())
      .filter(label => label.length > 0);
  }

  getFramework() {
    return this.isCodecept ? 'codeceptjs' : 'Cucumber';
  }

  getIds(opts = {}) {
    return new Promise((res, rej) => {
      const params = new URLSearchParams(opts).toString();

      const req = request(`${URL.trim()}/api/test_data?api_key=${this.apiKey}&${params}`, { method: 'GET' }, (resp) => {
        // The whole response has been received. Print out the result.
        let message = '';

        resp.on('end', () => {
          if (resp.statusCode !== 200) {
            rej(message);
          } else {
            res(JSON.parse(message));
          }
        });

        resp.on('data', (chunk) => {
          message += chunk.toString();
        });

        resp.on('aborted', () => {
          console.log(' ✖️ Data was not sent to Testomat.io');
        });
      });

      req.on('error', (err) => {
        console.log(`Error: ${err.message}`);
        rej(err);
      });

      req.end();
    });
  }

  getFilesFromServer(opts = {}) {
    return new Promise((res, rej) => {
      const params = new URLSearchParams({ with_files: 'true', ...opts }).toString();

      const req = request(`${URL.trim()}/api/test_data?api_key=${this.apiKey}&${params}`, { method: 'GET' }, (resp) => {
        let message = '';

        resp.on('end', () => {
          if (resp.statusCode !== 200) {
            console.log(' ✖️ Failed to fetch files from Testomat.io:', message);
            rej(new Error(message));
          } else {
            res(JSON.parse(message));
          }
        });

        resp.on('data', (chunk) => {
          message += chunk.toString();
        });

        resp.on('aborted', () => {
          console.log(' ✖️ Request to Testomat.io was aborted');
          rej(new Error('Request aborted'));
        });
      });

      req.on('error', (err) => {
        console.log(`Error: ${err.message}`);
        rej(err);
      });

      req.end();
    });
  }

  send(opts = {}) {
    return new Promise((resolve, reject) => {
      if (this.apiKey) {
        const labelsFromEnv = this.parseLabels(process.env.TESTOMATIO_LABELS || process.env.TESTOMATIO_SYNC_LABELS);

        const tests = this.tests.map(test => {
          if (labelsFromEnv.length > 0) {
            test.labels = labelsFromEnv;
          }
          return test;
        });

        const data = JSON.stringify({
          ...opts, tests, files: this.files, framework: this.getFramework(), language: 'gherkin',
        });

        console.log('\n 🚀 Sending data to testomat.io\n');
        const req = request(`${URL.trim()}/api/load?api_key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
        }, (resp) => {
          // The whole response has been received. Print out the result.
          let message = '';

          resp.on('end', () => {
            if (resp.statusCode >= 400) {
              console.log(' ✖️ ', message);
            } else {
              console.log(' 🎉 Data sent to Testomat.io');
            }
            resolve();
          });

          resp.on('data', (chunk) => {
            message += chunk.toString();
          });

          resp.on('aborted', () => {
            console.log(' ✖️ Data was not sent to Testomat.io');
            reject(new Error('aborted'));
          });
        });

        req.on('error', err => {
          console.log(' ✖️  Error: Server cannot be reached');
          reject(err);
        });

        req.write(data);
        req.end();
      }
    });
  }
}

module.exports = Reporter;
