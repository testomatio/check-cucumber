const URL = process.env.TESTOMATIO_URL || 'https://app.testomat.io';
const isHttps = URL.startsWith('https');
const fs = require('fs');
const path = require('path');
const { request } = isHttps ? require('https') : require('http');

class Importer {
  constructor(apiKey, isCodecept) {
    if (!apiKey) {
      console.error('✖️  Cant pull report, api key not set');
    }
    this.apiKey = apiKey;
    this.files = {};
  }

  async pull() {
    const files = await this.send();
    if (!files) return;

    files.forEach(({ file, contents }) => {
      const filePath = path.resolve(file);
      const directoryPath = path.dirname(filePath);

      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
      }

      fs.writeFileSync(filePath, contents);
      console.log(`- "${file}" updated successfully.`);
    });
  }

  send() {
    return new Promise((res, rej) => {
      const req = request(`${URL.trim()}/api/pull?api_key=${this.apiKey}`, { method: 'GET' }, (resp) => {
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
          console.log(' ✖️ Data was not received from Testomat.io');
        });
      });

      req.on('error', (err) => {
        console.log(`Error: ${err.message}`);
        rej(err);
      });

      req.end();
    });
  }

}

module.exports = Importer;
