#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const { program } = require('commander');
const os = require('os');
const path = require('path');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { streamToResponse } = require('ai');
const readline = require('readline');

class LLMClient {
    constructor(config) {
        this.config = config;
        this.clients = {};

        // Initialize enabled clients
        if (config.openai?.apiKey) {
            this.clients.openai = new OpenAI({ apiKey: config.openai.apiKey });
        }
        if (config.anthropic?.apiKey) {
            this.clients.anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
        }
        if (config.bedrock?.credentials) {
            this.clients.bedrock = new BedrockRuntimeClient({
                region: config.bedrock.region || 'us-east-1',
                credentials: config.bedrock.credentials
            });
        }
        if (config.ollama?.baseUrl) {
            this.clients.ollama = { baseUrl: config.ollama.baseUrl };
        }
    }

    async getCompletion({ model, prompt, stream = false }) {
        const selectedModel = model || this.config.defaultModel || 'openai';

        if (!this.clients[selectedModel]) {
            throw new Error(`Model ${selectedModel} is not configured. Please check your configuration.`);
        }

        switch (selectedModel) {
            case 'openai': {
                const response = await this.clients.openai.chat.completions.create({
                    model: this.config.openai.model || 'gpt-4',
                    messages: [{ role: 'user', content: prompt }],
                    stream
                });

                if (stream) {
                    return streamToResponse(response);
                }

                return response.choices[0].message.content;
            }

            case 'anthropic': {
                const response = await this.clients.anthropic.messages.create({
                    model: this.config.anthropic.model || 'claude-3-opus-20240229',
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: prompt }],
                    stream
                });

                if (stream) {
                    return streamToResponse(response);
                }

                return response.content[0].text;
            }

            case 'bedrock': {
                const input = {
                    modelId: this.config.bedrock.model || 'anthropic.claude-3-sonnet-20240229-v1:0',
                    contentType: 'application/json',
                    accept: 'application/json',
                    body: JSON.stringify({
                        prompt,
                        max_tokens: 1024,
                    })
                };

                const command = new InvokeModelCommand(input);
                const response = await this.clients.bedrock.send(command);
                const responseBody = JSON.parse(new TextDecoder().decode(response.body));

                return responseBody.completion;
            }

            case 'ollama': {
                const response = await fetch(`${this.clients.ollama.baseUrl}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: this.config.ollama.model || 'llama2',
                        prompt,
                        stream
                    })
                });

                if (stream) {
                    return streamToResponse(response.body);
                }

                const data = await response.json();
                return data.response;
            }

            default:
                throw new Error(`Unsupported model: ${selectedModel}`);
        }
    }
}

let llmClient;
let config;

function getRandomIndex(max) {
    return Math.floor(Math.random() * max);
}

async function getRandomCommitAroundOneYearAgo() {
    const oneYearAgoDate = new Date();
    oneYearAgoDate.setFullYear(oneYearAgoDate.getFullYear() - 1);
    oneYearAgoDate.setDate(oneYearAgoDate.getDate() - 7);

    const endDate = new Date(oneYearAgoDate);
    endDate.setDate(endDate.getDate() + 14);

    const startDateString = `${oneYearAgoDate.getFullYear()}-${String(oneYearAgoDate.getMonth() + 1).padStart(2, '0')}-${String(oneYearAgoDate.getDate()).padStart(2, '0')}`;
    const endDateString = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const userEmail = execSync('git config user.email').toString().trim();
    const log = execSync(`git log --since="${startDateString} 00:00" --until="${endDateString} 23:59" --author="${userEmail}" --no-merges --pretty=format:"%H"`).toString();
    const commits = log.split('\n').filter(Boolean);

    if (commits.length === 0) {
        return null;
    }

    const randomIndex = getRandomIndex(commits.length);
    const randomCommit = commits[randomIndex];
    const diff = execSync(`git show ${randomCommit}`).toString();

    return { commit: randomCommit, diff };
}

async function askUserForAction(commitData) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log(`Selected commit: ${commitData.commit}`);
        console.log(`Diff:\n${commitData.diff}`);
        rl.question('Do you want to review this commit? (Y)es/(N)o/(R)eroll, default is Reroll): ', function (answer) {
            answer = answer.toLowerCase().trim();
            if (answer === 'y' || answer === 'yes') {
                resolve('yes');
            } else if (answer === 'n' || answer === 'no') {
                resolve('no');
            } else {
                resolve('reroll');
            }
            rl.close();
        });
    });
}

async function getCommitMessage(diff, options = {}) {
    const prompt = `Given the following code changes:\n\n${diff}\n\nWhat is an appropriate commit message?`;
    const response = await llmClient.getCompletion({ model: options.model, prompt });
    return response.replace(/\"/g, '');
}

async function getReview(diff, options = {}) {
    let prompt = `Review the following code changes and suggest improvements \n\n${diff}`;
    if (config.reviewLanguage) {
        prompt += `\n\nPlease respond in this language: ${config.reviewLanguage}`;
    }

    return await llmClient.getCompletion({
        model: options.model,
        prompt,
        stream: true  // 리뷰는 길어질 수 있으므로 스트리밍 사용
    });
}

function init() {
    try {
        const configPath = path.join(os.homedir(), '.commit-helper-config.json');
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        llmClient = new LLMClient(config);
    } catch (err) {
        console.log('Configuration error. Please set up your configuration using the config command.');
        console.log('commit-helper config --help');
        process.exit(1);
    }
}

program.version('0.1.0');

program
    .command('message')
    .description('Create a commit message using AI.')
    .option('-m, --model <model>', 'Specify the AI model to use (openai/anthropic/bedrock/ollama)')
    .action(async (options) => {
        init();
        const diff = execSync('git diff').toString();

        if (!diff) {
            console.log('No changes to commit.');
            return;
        }

        const commitMessage = await getCommitMessage(diff, options);
        console.log(commitMessage);
    });

program
    .command('review')
    .description('Review changes using AI.')
    .option('-m, --model <model>', 'Specify the AI model to use (openai/anthropic/bedrock/ollama)')
    .action(async (options) => {
        init();
        const diff = execSync('git diff').toString();

        if (!diff) {
            console.log('No changes to review.');
            return;
        }

        const review = await getReview(diff, options);
        console.log(review);
    });

program
    .command('timetravel')
    .description('Review a random commit from around one year ago.')
    .option('-m, --model <model>', 'Specify the AI model to use (openai/anthropic/bedrock/ollama)')
    .action(async (options) => {
        init();

        let commitData;
        let userAction = 'reroll';

        while (userAction === 'reroll') {
            commitData = await getRandomCommitAroundOneYearAgo();
            if (!commitData) {
                console.log('No commits from around one year ago to review.');
                return;
            }

            userAction = await askUserForAction(commitData);
        }

        if (userAction === 'yes') {
            console.log(`Reviewing commit ${commitData.commit}...`);
            const review = await getReview(commitData.diff, options);
            console.log(`Review for commit ${commitData.commit}:\n${review}`);
        }
    });

program
    .command('config')
    .description('Configure the commit helper')
    .option('--openai-key <key>', 'Set OpenAI API key')
    .option('--openai-model <model>', 'Set OpenAI model (default: gpt-4)')
    .option('--anthropic-key <key>', 'Set Anthropic API key')
    .option('--anthropic-model <model>', 'Set Anthropic model (default: claude-3-opus-20240229)')
    .option('--bedrock-access-key <key>', 'Set AWS Bedrock access key')
    .option('--bedrock-secret-key <key>', 'Set AWS Bedrock secret key')
    .option('--bedrock-region <region>', 'Set AWS Bedrock region')
    .option('--bedrock-model <model>', 'Set AWS Bedrock model')
    .option('--ollama-url <url>', 'Set Ollama base URL')
    .option('--ollama-model <model>', 'Set Ollama model')
    .option('--default-model <model>', 'Set default model (openai/anthropic/bedrock/ollama)')
    .option('-l, --review-language <language>', 'Set the language for reviews')
    .action((options) => {
        const configPath = path.join(os.homedir(), '.commit-helper-config.json');
        let oldConfig = {};

        if (fs.existsSync(configPath)) {
            oldConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }

        const newConfig = {
            ...oldConfig,
            defaultModel: options.defaultModel || oldConfig.defaultModel,
            reviewLanguage: options.reviewLanguage || oldConfig.reviewLanguage,
        };

        // Update OpenAI config
        if (options.openaiKey || options.openaiModel) {
            newConfig.openai = {
                ...oldConfig.openai,
                apiKey: options.openaiKey || oldConfig.openai?.apiKey,
                model: options.openaiModel || oldConfig.openai?.model || 'gpt-4'
            };
        }

        // Update Anthropic config
        if (options.anthropicKey || options.anthropicModel) {
            newConfig.anthropic = {
                ...oldConfig.anthropic,
                apiKey: options.anthropicKey || oldConfig.anthropic?.apiKey,
                model: options.anthropicModel || oldConfig.anthropic?.model || 'claude-3-opus-20240229'
            };
        }

        // Update Bedrock config
        if (options.bedrockAccessKey || options.bedrockSecretKey || options.bedrockRegion || options.bedrockModel) {
            newConfig.bedrock = {
                ...oldConfig.bedrock,
                credentials: {
                    accessKeyId: options.bedrockAccessKey || oldConfig.bedrock?.credentials?.accessKeyId,
                    secretAccessKey: options.bedrockSecretKey || oldConfig.bedrock?.credentials?.secretAccessKey
                },
                region: options.bedrockRegion || oldConfig.bedrock?.region || 'us-east-1',
                model: options.bedrockModel || oldConfig.bedrock?.model || 'anthropic.claude-3-sonnet-20240229-v1:0'
            };
        }

        // Update Ollama config
        if (options.ollamaUrl || options.ollamaModel) {
            newConfig.ollama = {
                ...oldConfig.ollama,
                baseUrl: options.ollamaUrl || oldConfig.ollama?.baseUrl || 'http://localhost:11434',
                model: options.ollamaModel || oldConfig.ollama?.model || 'llama2'
            };
        }

        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
        console.log('Configuration updated successfully.');
    });

program.parse(process.argv);