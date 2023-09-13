#!/usr/bin/env node

const fs = require('fs');
const {execSync} = require('child_process');
const {program} = require('commander');
const {Configuration, OpenAIApi} = require("openai");
const os = require('os');
const path = require('path');

const readline = require('readline');

let openai;
let config;

async function getCommitMessage(diff) { "any"
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

function getRandomIndex(max) {
    return Math.floor(Math.random() * max);
}

async function getRandomCommitAroundOneYearAgo() {
    const oneYearAgoDate = new Date();
    oneYearAgoDate.setFullYear(oneYearAgoDate.getFullYear() - 1);
    oneYearAgoDate.setDate(oneYearAgoDate.getDate() - 7); // 일주일 전으로 설정

    const endDate = new Date(oneYearAgoDate);
    endDate.setDate(endDate.getDate() + 14); // 일주일 후로 설정

    const startDateString = `${oneYearAgoDate.getFullYear()}-${String(oneYearAgoDate.getMonth() + 1).padStart(2, '0')}-${String(oneYearAgoDate.getDate()).padStart(2, '0')}`;
    const endDateString = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const userEmail = execSync('git config user.email').toString().trim();
    const log = execSync(`git log --since="${startDateString} 00:00" --until="${endDateString} 23:59" --author="${userEmail}" --no-merges --pretty=format:"%H"`).toString();
    const commits = log.split('\n').filter(Boolean); // filter(Boolean) to remove empty strings

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

program.version('0.0.7');

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

program.command('timetravel')
    .description('Review a random commit from the past year.')
    .action(async () => {
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
            const review = await getReview(commitData.diff);
            console.log(`Review for commit ${commitData.commit}:\n${review}`);
        }
    });

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
