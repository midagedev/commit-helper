- # Commit Helper

Commit Helper is a Node.js command line tool that uses OpenAI's GPT-4 model to generate commit messages and code reviews based on your git diff.
## Installation

```bash

npm install -g @midagedev/commit-helper
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
# result example: "Added option to specify review language and improved configuration handling in commit-helper.js"
```



The generated commit message will be printed to the console.
### Generate a code review

To generate a code review based on your git diff, run the `review` command:

```bash

commit-helper review
# result example: 
# 본 코드 변경 사항에 대한 몇 가지 개선 제안입니다.

# 1. `let config;` 라인. 전역 변수의 사용을 최소화하세요. 대신 함수의 인수로 필요한 값을 전달하거나 필요한 경우 클래스를 사용하함수 인수를 사용하도록 변경하조십시오.

# 2. 에러처리를 보완하세요. OpenAI API 키가 없는 경우 현재 코드는 단순히 오류 메시지를 보여주고 프로세스를 종료합니다. 이는 사용 야기합니다. 가급적 에러를 보다 세분화하고, 사용자가 문제를 이해하고 해결할 수 있도록 도움을 주는 오류 메시지를 부여하는 것이 좋습니다.

# 3. 사용자에게 기본로 설정할 언어에 대한 메시지를 제공하실 수 있습니다. 만약 사용자가 리뷰어의 언어를 설정하지 않으면, 어떤 언 것이 사용자 경험을 개선하겠습니다.

# 4. `review-language` 옵션이 필수 사항이 아니라면, 이를 설정하지 않을 경우 수행되는 작업을 계획하세요. 현재 코드는 이 설정이 없으면 오류가 발생할 수 있습니다.

# 5. `fs.writeFileSync()` 실패 시 처리를 추가하세요. 파일 기록 실패는 다양한 이유로 발생하며, 그에 따른 적절한 에러 메시지를 제공하고 회복하는 것이 필요합니다.

```

### Time Travel
To review a random commit from around one year ago:

```bash

commit-helper timetravel

```