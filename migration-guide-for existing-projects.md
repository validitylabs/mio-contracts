# Migration guide for existing projects

- Ensure you are using [this solidity VSCode plugin](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity)
- Run `yarn add solhint --dev`
- Ensure you have installed the exact solidity version you want to use in your contracts (package.json), for example `"solc": "0.4.24"`
- Modify `.vscode/settings` and replace all solidity entries with the following:
```
"solidity.enabledAsYouTypeCompilationErrorCheck": true,
"solidity.linter": "solhint",
```

- Create `.solhint` file with this content:
```
{
    "extends": "default",
    "rules": {
    }
}
```

- Update your `package.json` like this:
```
"lint": "npx solhint --formatter table contracts/**/*.sol",
"test": "yarn lint && npx cross-env NODE_ENV=develop cross-env TASK=test node ./tools/server/index",
```

- Replace `tools/server/runner.js` with version from [snowflake-solidity](https://github.com/validitylabs/snowflake-solidity)
- See updated `README.md` on  [snowflake-solidity](https://github.com/validitylabs/snowflake-solidity) repository for more information about all changes
- Happy coding :)

## Troubleshooting
If the VSCode linter doesn't work as expected, check the VSCode Settings page and search for `solidity`. Remove all occurences.
