#!/usr/bin/env node

const fs = require('fs');
const {execSync} = require('child_process');
const {program} = require('commander');
const { Configuration, OpenAIApi } = require("openai");

let openai;

async function getCommitMessage(diff) {
    const prompt = `Given the following code changes:\n\n${diff}\n\nWhat is an appropriate commit message?`;
    const chatCompletion = await openai.createChatCompletion({
        model: 'gpt-4', messages: [{role: 'user', content: prompt,}]
    });
    return JSON.parse(chatCompletion.data.choices[0].message.content)
}

program.version('1.0.0');

program
    .command('commit', {isDefault: true})
    .description('Create a commit with a message from the OpenAI API.')
    .action(async () => {

        try {

            const config = JSON.parse(fs.readFileSync('.config', 'utf-8'));
            openai =  new OpenAIApi(new Configuration({apiKey: config.apiKey}))
        } catch (err) {
            console.error(err)
            console.log('No OpenAI API key found. Please set your key using the config command.');
            console.log('commit-helper config -k <key>');
            process.exit(1);
        }

        const diff = execSync('git diff').toString();

        if (!diff) {
            console.log('No changes to commit.');
            return;
        }

        const commitMessage = await getCommitMessage(diff);
        console.log(commitMessage);
    });

program
    .command('config')
    .option('-k, --api-key <key>', 'Set the OpenAI API key.')
    .action((key) => {
        fs.writeFileSync('.config', JSON.stringify(key), 'utf-8');
        console.log('OpenAI API key set successfully.');
    });

program.parse(process.argv);
