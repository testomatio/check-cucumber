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

  getFramework() {
    return this.isCodecept ? 'codeceptjs' : 'Cucumber';
  }

  getIds() {
    return new Promise((res, rej) => {
      const req = request(`${URL.trim()}/api/test_data?api_key=${this.apiKey}`, { method: 'GET' }, (resp) => {
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

  send(opts = {}) {
    return new Promise((resolve, reject) => {
      if (this.apiKey) {
        const data = JSON.stringify({
          ...opts, tests: this.tests, files: this.files, framework: this.getFramework(), language: 'gherkin',
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
