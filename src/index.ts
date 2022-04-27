#!/usr/bin/env node

import chalk from 'chalk';
import { program } from 'commander';
import { format } from 'date-fns';
import inquirer from 'inquirer';
import shelljs from 'shelljs';

const askEnvironment = async (): Promise<string> => {
  const res: { askEnvironment: string } = await inquirer.prompt({
    name: 'askEnvironment',
    type: 'list',
    message: 'What enivornment do you want to run the test against?\n',
    choices: ['dev', 'int'],
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

const options = getOptions();
console.log(chalk.blue(`Using options "${JSON.stringify(options)}"`));

const env = await askEnvironment();
console.log(chalk.blue(`Starting performance test with environment "${env}".`));

const reportName = 'report.json';

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
    shelljs.mv(
      '-f',
      `${reportName}.html`,
      `${options.outputLocation}/${env.toUpperCase()}-performance-test-${format(
        new Date(),
        'yyyy.MM.dd-hh:mm'
      )}.html`
    );
    console.log(chalk.green(`All done!`));
  }
} catch (err) {
  console.log(chalk.redBright(`Error occured: `, err));
}
