- # Commit Helper

Commit Helper is a Node.js command line tool that uses OpenAI's GPT-4 model to generate commit messages and code reviews based on your git diff.
## Installation

```bash

npm install -g commit-helper
```


## Configuration

Before you use the `commit-helper`, you need to set up your OpenAI API key. Use the `config` command to set your key:

```bash

commit-helper config -k <your-openai-api-key>
```



You can also set the language for the code review:

```bash

commit-helper config -l <language>
```



The `language` is which you want the review to be.

The configuration is saved locally in your project directory.
## Usage
### Generate a commit message

To generate a commit message based on your git diff, run the `message` command:

```bash

commit-helper
```



The generated commit message will be printed to the console.
### Generate a code review

To generate a code review based on your git diff, run the `review` command:

```bash

commit-helper review
```



The generated code review will be printed to the console.
## Note

The accuracy of the generated messages and reviews can vary and they are not guaranteed to always be correct. Also, the accuracy of non-English responses might be less consistent. It is always good practice to review any generated messages or reviews before use.
