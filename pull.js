const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Pull tests from Testomat.io and save as .feature files
 */
class Pull {
  constructor(reporter, targetDir = '.') {
    this.reporter = reporter;
    this.targetDir = targetDir;
  }

  /**
   * Execute pull operation
   * @param {Object} options - Pull options
   * @param {boolean} options.dryRun - Preview files without creating them
   */
  async execute(options = {}) {
    try {
      console.log(chalk.cyan('🔄 Fetching manual tests from Testomat.io...'));
      
      const data = await this.reporter.getFilesFromServer();
      
      if (!data || (!data.files && (!data.tests || data.tests.length === 0))) {
        console.log(chalk.yellow('⚠️  No files found on server'));
        return;
      }

      if (!data.files) {
        data.files = {};
      }

      const filesCreated = [];
      const fileTree = {};

      // Process files from server - server now sends .feature files directly
      for (const [fileName, content] of Object.entries(data.files)) {
        const targetPath = path.join(this.targetDir, fileName);
        const targetDir = path.dirname(targetPath);

        // Create directory structure
        if (!fs.existsSync(targetDir)) {
          if (!options.dryRun) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
        }

        // Build file tree for display
        const relativePath = path.relative(this.targetDir, targetPath);
        this.addToFileTree(fileTree, relativePath);

        if (options.dryRun) {
          console.log(chalk.gray(`  Would create: ${relativePath}`));
        } else {
          fs.writeFileSync(targetPath, content);
          filesCreated.push(relativePath);
          console.log(chalk.green(`  Created: ${relativePath}`));
        }
      }

      // Display results
      if (options.dryRun) {
        console.log(chalk.cyan('\n📋 Dry run completed. Files that would be created:'));
      } else {
        console.log(chalk.green(`\n✅ Successfully pulled ${filesCreated.length} files`));
      }

      // Display file tree
      this.displayFileTree(fileTree);

    } catch (error) {
      console.error(chalk.red('❌ Failed to pull files:'), error.message);
      throw error;
    }
  }


  /**
   * Add file to tree structure for display
   * @param {Object} tree - File tree object
   * @param {string} filePath - File path
   */
  addToFileTree(tree, filePath) {
    const parts = filePath.split(path.sep);
    let current = tree;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 ? null : {};
      }
      if (current[part]) {
        current = current[part];
      }
    });
  }

  /**
   * Display file tree
   * @param {Object} tree - File tree object
   * @param {string} prefix - Prefix for indentation
   */
  displayFileTree(tree, prefix = '') {
    Object.keys(tree).forEach((key, index, array) => {
      const isLast = index === array.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      
      console.log(chalk.gray(prefix + connector + key));
      
      if (tree[key] && typeof tree[key] === 'object') {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        this.displayFileTree(tree[key], newPrefix);
      }
    });
  }
}

module.exports = Pull;