#!/usr/bin/env node

const fs = require('fs');
const {execSync} = require('child_process');
const {program} = require('commander');
const {Configuration, OpenAIApi} = require("openai");
const os = require('os');
const path = require('path');

let openai;
let config;

async function getCommitMessage(diff) {
    const prompt = `Given the following code changes:\n\n${diff}\n\nWhat is an appropriate commit message?`;
    const chatCompletion = await openai.createChatCompletion({
        model: 'gpt-4', messages: [{role: 'user', content: prompt,}]
    });
    return chatCompletion.data.choices[0].message.content.replace(/\"/g, '')
}

async function getReview(diff) {
    let prompt = `Review the following code changes and suggest improvements \n\n${diff}`;
    if (config.reviewLanguage) {
        prompt += `\n\nPlease respond in this language: ${config.reviewLanguage}`;
    }
    const chatCompletion = await openai.createChatCompletion({
        model: 'gpt-4', messages: [{role: 'user', content: prompt,}]
    });
    return chatCompletion.data.choices[0].message.content
}

function init() {
    try {
        const configPath = path.join(os.homedir(), '.commit-helper-config.json');
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        openai = new OpenAIApi(new Configuration({apiKey: config.apiKey}))
    } catch (err) {
        console.log('No OpenAI API key found. Please set your key using the config command.');
        console.log('commit-helper config -k <key>');
        process.exit(1);
    }
}

program.version('1.0.0');

program
    .command('message', {isDefault: true})
    .description('Create a commit with a message from the OpenAI API.')
    .action(async () => {
        init();
        const diff = execSync('git diff').toString();

        if (!diff) {
            console.log('No changes to commit.');
            return;
        }

        const commitMessage = await getCommitMessage(diff);
        console.log(commitMessage);
    });

program.command('review')
    .description('Review a changes with the OpenAI API.')
    .action(async () => {
        init();
        const diff = execSync('git diff').toString();

        if (!diff) {
            console.log('No changes to review.');
            return;
        }

        const review = await getReview(diff);
        console.log(review);
    })

program
    .command('config')
    .option('-k, --api-key <key>', 'Set the OpenAI API key.')
    .option('-l, --review-language <reviewLanguage>', 'Set the language for the review.')
    .action((config) => {
        const configPath = path.join(os.homedir(), '.commit-helper-config.json');
        let oldConfig = {};
        if (fs.existsSync(configPath)) {
            oldConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
        fs.writeFileSync(configPath, JSON.stringify({...oldConfig, ...config}), 'utf-8');
        console.log('Config saved.');
    });

program.parse(process.argv);
