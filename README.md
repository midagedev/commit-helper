# Commit Helper

Git 커밋 메시지 작성과 코드 리뷰를 AI의 도움을 받아 수행하는 CLI 도구입니다. OpenAI, Anthropic Claude, AWS Bedrock, Ollama 등 다양한 AI 모델을 지원합니다.

## 특징

- 다양한 AI 모델 지원 (OpenAI GPT-4, Claude 3, AWS Bedrock, Ollama)
- 커밋 메시지 자동 생성
- AI 기반 코드 리뷰
- 1년 전 커밋 회고 기능
- 실시간 스트리밍 응답 지원
- 다국어 리뷰 지원

## 설치

```bash
npm install -g commit-helper
```

## 설정

처음 사용하기 전에 AI 모델에 대한 설정이 필요합니다. 다음 명령어들로 설정할 수 있습니다:

```bash
# OpenAI 설정
commit-helper config --openai-key "your-api-key" --openai-model "gpt-4"

# Anthropic Claude 설정
commit-helper config --anthropic-key "your-api-key" --anthropic-model "claude-3-opus-20240229"

# AWS Bedrock 설정
commit-helper config --bedrock-access-key "your-access-key" \
                    --bedrock-secret-key "your-secret-key" \
                    --bedrock-region "us-east-1" \
                    --bedrock-model "anthropic.claude-3-sonnet-20240229-v1:0"

# Ollama 설정
commit-helper config --ollama-url "http://localhost:11434" \
                    --ollama-model "llama2"

# 기본 모델 설정
commit-helper config --default-model "openai"

# 리뷰 언어 설정 (예: 한국어)
commit-helper config --review-language "Korean"
```

## 사용법

### 커밋 메시지 생성

현재 스테이징된 변경사항에 대한 커밋 메시지를 생성합니다:

```bash
commit-helper message                  # 기본 모델 사용
commit-helper message -m anthropic     # 특정 모델 지정
```

### 코드 리뷰

현재 변경사항에 대한 코드 리뷰를 받습니다:

```bash
commit-helper review                   # 기본 모델 사용
commit-helper review -m bedrock        # AWS Bedrock 사용
```

### 타임머신 (1년 전 커밋 리뷰)

약 1년 전의 랜덤한 커밋을 선택하여 리뷰합니다:

```bash
commit-helper timetravel               # 기본 모델 사용
commit-helper timetravel -m ollama     # Ollama 사용
```

## 설정 파일

설정은 `~/.commit-helper-config.json`에 저장되며, 다음과 같은 구조를 가집니다:

```json
{
  "defaultModel": "openai",
  "reviewLanguage": "Korean",
  "openai": {
    "apiKey": "sk-...",
    "model": "gpt-4"
  },
  "anthropic": {
    "apiKey": "sk-ant-...",
    "model": "claude-3-opus-20240229"
  },
  "bedrock": {
    "credentials": {
      "accessKeyId": "AKIA...",
      "secretAccessKey": "..."
    },
    "region": "us-east-1",
    "model": "anthropic.claude-3-sonnet-20240229-v1:0"
  },
  "ollama": {
    "baseUrl": "http://localhost:11434",
    "model": "llama2"
  }
}
```

## 지원하는 모델

### OpenAI
- 기본 모델: gpt-4
- 다른 OpenAI 모델들도 설정 가능

### Anthropic Claude
- 기본 모델: claude-3-opus-20240229
- 다른 Claude 모델들도 설정 가능

### AWS Bedrock
- 기본 모델: anthropic.claude-3-sonnet-20240229-v1:0
- AWS Bedrock에서 제공하는 다른 모델들도 사용 가능

### Ollama
- 기본 모델: llama2
- Ollama에서 지원하는 다른 모델들도 사용 가능

## 라이선스

MIT

## 기여하기

이슈와 풀 리퀘스트는 언제나 환영합니다!