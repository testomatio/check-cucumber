# check-cucumber

CLI tool that checks Gherkin formatted feature files and imports them into Testomatio.

## Cli

To import tests into Testomatio run `check-cucumber` via npx:

```
TESTOMATIO=API_KEY npx check-cucumber -d example/cucumber
```

**Note: replace API_KEY wit key from Testomatio**

### CLI Options:

- `-d, --dir` - Directory of the project
- `-c, --codeceptjs` - If it is codeceptjs project use this option

**Note :** Running this will create Suites with folder and file name as sub suites.

To change host of endpoint for receiving data, and set it to other than app.testomat.io use TESTOMATIO_URL environment variable:

TESTOMATIO_URL=https://beta.testomat.io

### Sample Output

![check-cucumber-output](https://user-images.githubusercontent.com/24666922/78559548-2dc7fb00-7832-11ea-8c69-0722222a82fe.png)

### Assign IDs

To set Testomatio IDs for scenarios and features in files run this command with `--update-ids` option.

```
TESTOMATIO=API_KEY npx check-cucumber -d example/cucumber --update-ids
```

Scenarios should already be imported into Testomatio

### Disable Detached Tests

If a test from a previous import was not found on next import it is marked as "detached".
This is done to ensure that deleted tests are not staying in Testomatio while deleted in codebase.

To disable this behavior and don't mark anything on detached on import use `--no-detached` option

```
TESTOMATIO=API_KEY npx check-cucumber -d example/cucumber --no-detached
```

## Synchronous Import

By default `check-cucumber` doesn't wait for all tests to be processed. It sends request to Testomatio and exits. To wait for processing to finish use `--sync` option.

```
TESTOMATIO=API_KEY npx check-cucumber -d example/cucumber --sync
```

Please note, that this will take a long time on a large codebase.

## Clean Test IDs

If you want to import the synced project as new project, you have to clean the test ids.
To clean up test ids without connecting to Testomatio project use `--purge` option:

```
npx check-cucumber -d example/cucumber --purge
```

This method may be unsafe, as it cleans all `@S*` and `@T*` tags from tests and suites. So if you have a tag like `@Test1234` this may also be removed. If you use this option make sure if all the test titles a proper before committing the tests in GIT.

> **Note:** An alias of `--purge` option is `--unsafe-clean-ids`.

To clean only test ids set from a specific project use `--clean-ids` option instead:

```
TESTOMATIO=API_KEY npx check-cucumber -d example/cucumber --clean-ids
```

TESTOMATIO is API key for old project.

### Check IDs

To check where all scenarios and features have Testomatio IDs run this command with `--check-ids` option.

```
TESTOMATIO=API_KEY npx check-cucumber -d example/cucumber --check-ids
```

If there is a feature or scenario without a Testomatio ID, the command exits with a non-zero status code.
If all features and scenarios have Testomatio IDs, the command imports them into Testomatio.

### Import Into a Branch

Tests can be imported into a specific branch if `TESTOMATIO_BRANCH` parameter is used.
Branch is matched by its id. If branch was not found, it will be created.

```
TESTOMATIO_BRANCH="dev" TESTOMATIO=1111111 npx check-tests CodeceptJS "**/*{.,_}{test,spec}.js"
```

### Keep Structure of Source Code

When tests in source code have IDs assigned and those tests are imported, Testomat.io uses current structure in a project to put the tests in. If folders in source code doesn't match folders in Testomat.io project, existing structure in source code will be ignored. To force using the structure from the source code, use `--keep-structure` flag on import:

```
TESTOMATIO=1111111 npx check-tests CodeceptJS "**/*{.,_}{test,spec}.js" --keep-structure
```

> This may be helpful when you want to align current project with the source code and use the source code as the source of truth for tests.


### Delete Empty Suites

If tests were marked with IDs and imported to already created suites in Testomat.io
newly imported suites may become empty. Use `--no-empty` option to clean them up after import.

```
TESTOMATIO=1111111 npx check-tests CodeceptJS "**/*{.,_}{test,spec}.js" --no-empty
```

> This prevents usage --keep-structure option.

### Import Into a Specific Suite

To put all imported tests into a specific suite (folder) pass in `TESTOMATIO_PREPEND_DIR` environment variable:

```
TESTOMATIO_PREPEND_DIR="MyTESTS" TESTOMATIO=API_KEY npx check-cucumber -d example/cucumber
```

### Import Manual BDD Tests From Source Code

If you have manual tests in the repository and want to import them into Testomatio you can use `.manual.feature` extension in the feature file. Tests will be imported as well as automated tests and will be marked as `manual` in Testomatio. For instance:

```
mark-as-completed.manual.feature
```

---

License MIT.

Part of [Testomat.io](https://testomat.io/)
