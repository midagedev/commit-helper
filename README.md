# Commit Helper

The `commit-helper` is a CLI tool that generates Git commit messages using OpenAI's GPT-4 model.
## Installation

First, you must have Node.js installed to use this tool. After installing Node.js, you can install `commit-helper` with the following command:

```bash

npm install -g commit-helper
```


## Usage

First, you need to set the OpenAI API key. You can do this by running:

```bash

commit-helper config -k <Your-OpenAI-API-Key>
```



After setting the API key, if you want to generate a commit message for the current Git changes in your directory, run:

```bash

commit-helper commit
```



This command runs `git diff` to get the current changes, passes them to the OpenAI API, and then prints the generated commit message.
## Note
- This tool operates within your project directory and will not work if there are no Git changes. 
- There may be costs associated with using the OpenAI API. Please check OpenAI's [pricing policy](https://openai.com/pricing)  before use. 
- The OpenAI API key is stored in the `.config` file and this file should be located in your project directory.