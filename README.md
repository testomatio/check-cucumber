# check-cucumber

## Cli
Use this checker as CLI tool.

Run  `check-cucumber`  via npx:

TESTOMATIO=API_KEY npx check-cucumber -d ~/Documents/testomat/workspace/reporter/example/cucumber 

**Note: replace API_KEY wit key from testomat.io**

### CLI Options:

-   `-d, --dir` - Directory of the project
-   `-c, --codeceptjs` - If it is codecept project use this option

**Note :** Running this will create Suites with folder and file name as sub suites. 

### Development

To change host of endpoint for receiving data, and set it to other than app.testomat.io use TESTOMATIO_URL environment variable:

TESTOMATIO_URL=https://beta.testomat.io



### Sample Output

![check-cucumber-output](https://user-images.githubusercontent.com/24666922/78559548-2dc7fb00-7832-11ea-8c69-0722222a82fe.png)



## [](https://github.com/testomatio/check-tests#license-mit)License MIT

Part of  [Testomat.io](https://testomat.io/)
