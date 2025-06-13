# CLI Reference

🤩 **Cucumber checker by Testomat.io** - Analyze Cucumber feature files and sync them with Testomat.io

## Usage

```shell
npx check-cucumber <files> [options]
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `<files>` | Glob pattern for feature files to analyze | `**/*.feature` |
| `-d, --dir <dir>` | Test directory to scan | Current directory |
| `-e, --exclude <pattern>` | Exclude files by glob pattern | - |
| `-c, --codeceptjs` | Mark as CodeceptJS project | `false` |
| `--sync` | Import tests to Testomat.io and wait for completion | `false` |
| `-U, --update-ids` | Update test and suite files with Testomat.io IDs | `false` |
| `--clean-ids` | Remove Testomat.io IDs from test and suite files | `false` |
| `--check-ids` | Fail if there are missing IDs | `false` |
| `--purge, --unsafe-clean-ids` | Remove Testomat.io IDs without server verification | `false` |
| `--create` | Create tests and suites for missing IDs | `false` |
| `--no-empty` | Remove empty suites after import | `false` |
| `--keep-structure` | Prefer source code structure over Testomat.io structure | `false` |
| `--no-detached` | Don't mark unmatched tests as detached | `false` |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TESTOMATIO` | API key for Testomat.io authentication | - |
| `INPUT_TESTOMATIO-KEY` | Alternative API key (GitHub Actions) | - |
| `TESTOMATIO_URL` | Testomat.io API endpoint URL | `https://app.testomat.io` |
| `TESTOMATIO_BRANCH` | Branch name for test synchronization | - |
| `TESTOMATIO_WORKDIR` | Working directory for relative file paths | - |
| `TESTOMATIO_SUITE` | Import tests to a speficic folder by its ID | - |
| `TESTOMATIO_PREPEND_DIR` | Directory prefix for file names in reports | - |
| `TESTOMATIO_NO_DETACHED` | Don't mark unmatched tests as detached | - |
| `TESTOMATIO_TITLE_IDS` | Add test IDs to titles instead of tags | - |

## Examples

### Basic Usage

```shell
# Analyze all feature files in current directory
npx check-cucumber

# Analyze specific files
npx check-cucumber "features/**/*.feature"

# Analyze with custom directory
npx check-cucumber -d tests/features
```

### Excluding Files

```shell
# Exclude files by pattern
npx check-cucumber --exclude "**/wip/*.feature"

# Exclude multiple patterns
npx check-cucumber --exclude "**/{draft,temp}*.feature"
```

### Working with Testomat.io

```shell
# Import tests to Testomat.io
TESTOMATIO=<api-key> npx check-cucumber --sync

# Update test files with IDs from Testomat.io
TESTOMATIO=<api-key> npx check-cucumber --update-ids

# Clean IDs from test files
TESTOMATIO=<api-key> npx check-cucumber --clean-ids
```

### File Path Configuration

```shell
# import to a speific folder
TESTOMATIO_SUITE=Sa1b2c1d1 npx check-cucumber

# Make paths relative to specific directory
TESTOMATIO_WORKDIR=/project/root npx check-cucumber

# Add directory prefix to file paths
TESTOMATIO_PREPEND_DIR=cucumber npx check-cucumber
```

### Branch-specific Operations

```shell
# Sync tests for specific branch
TESTOMATIO=<api-key> TESTOMATIO_BRANCH=feature/new-tests npx check-cucumber --sync
```
