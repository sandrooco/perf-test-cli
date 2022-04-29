#!/usr/bin/env node

import chalk from 'chalk';
import { program } from 'commander';
import { format } from 'date-fns';
import fs from 'fs';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import shelljs from 'shelljs';

const askEnvironment = async (availableEnvs: string[]): Promise<string> => {
  const res: { askEnvironment: string } = await inquirer.prompt({
    name: 'askEnvironment',
    type: 'list',
    message: 'What environment do you want to run the test against?\n',
    choices: availableEnvs,
  });

  return res.askEnvironment;
};

const getOptions = (): { configPath: string; outputLocation: string } => {
  program
    .requiredOption('-c, --config <path>', 'artillery config path')
    .option(
      '-o, --outputLocation <path>',
      'output location for reports',
      shelljs.pwd()
    );
  program.parse();

  return {
    configPath: program.opts().config,
    outputLocation: program.opts().outputLocation,
  };
};
console.clear();

// Prepare configs and arguments
const reportName = 'report.json';
const options = getOptions();

console.log(chalk.blue(`Using options "${JSON.stringify(options)}"`));

// Load artillery config file
const artilleryConfig: { config: { environments: Record<string, unknown> } } =
  yaml.load(fs.readFileSync(options.configPath, 'utf8')) as any;

// Load envs from config
const availableEnvs = Object.keys(artilleryConfig?.config?.environments);

// Exit if no envs were found
if (!availableEnvs || !availableEnvs.length) {
  console.log(chalk.redBright(`no valid envs detected: `, availableEnvs));
  shelljs.exit(-1);
}

const env = await askEnvironment(availableEnvs);
console.log(chalk.blue(`Starting performance test with environment "${env}".`));

console.log(chalk.blue(`"${reportName}".`, options.outputLocation));

try {
  shelljs.exec(
    `artillery run --output ${reportName} --environment ${env} ${options.configPath}`
  );

  console.log(chalk.blue(`Test done, generating report`));
  if (shelljs.test('-f', reportName)) {
    // Create report html
    shelljs.exec(`artillery report ${reportName}`);

    // Remove report json
    shelljs.rm(reportName);

    // Create output directory if it doens't exist yet
    shelljs.mkdir('-p', options.outputLocation);

    // Copy report to requested ouput location
    const targetFile = `${
      options.outputLocation
    }/${env.toUpperCase()}-performance-test-${format(
      new Date(),
      'yyyy.MM.dd-HH:mm'
    )}.html`;
    shelljs.mv('-f', `${reportName}.html`, targetFile);
    console.log(chalk.green(`All done! Report available at ${targetFile}`));
  }
} catch (err) {
  console.log(chalk.redBright(`Error occured: `, err));
}
