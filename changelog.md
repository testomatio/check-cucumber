# 0.5.11

* Added `TESTOMATIO_TITLE_IDS` option to add IDs into Scenario titles

# 0.5.10

* Notify on ID duplication
* Fixed duplicating strings when adding tags with update-ids

# 0.5.9

* Fixed purging suite ids in feature files

# 0.5.8

- Added `--no-empty` option to delete empty suites after import

# 0.5.7

* Fixed adding extra spacing when updating ids

# 0.5.6

* Fixed working with duplicate scenarios

# 0.5.5

* Fixed `--update-ids` to add ids as tags
* Fixed `--purge` to clean up ids in tags

# 0.5.4

* Fixed puring in empty feature files

# 0.5.3

- Added `--create` option to create a test or suite by ID when they are not found in a project

# 0.5.2

* Fix analyzing empty feature files

# 0.5.1

* Added `--purge` command
* Fixed cleaning and updating empty feature files

# 0.5.0

* Added `--keep-structure` option to prefer source code structure over the structure in Testomat.io
* Uses `TESTOMATIO_BRANCH` env variable to import tests to a branch:

```
TESTOMATIO_BRANCH=dev TESTOMATIO=123456 npx check-cucumber ...
```
* Don't mark tests as "detached" when importing a single file

# 0.4.0

* Added `--update-ids` option to automatically assign test ids
* Added `--no-detached` option to not mark tests on detached on import
* Added `--clean-ids` command to remove automatically set ids with `--update-ids` command
* Added `--unsafe-clean-ids` command to remove automatically set ids, without server verification
* Added `TESTOMATIO_PREPEND_DIR="MyTESTS"` param to import tests into a specific folder/suite.

# 0.2.1

* Throw error when importing features & scenarios with empty titles
