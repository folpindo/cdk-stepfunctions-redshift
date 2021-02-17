const { AwsCdkConstructLibrary } = require('projen');

const AWS_CDK_VERSION = '1.87.0';
const PROJECT_NAME = 'cdk-stepfunctions-redshift';
const PROJECT_DESCRIPTION = 'A JSII construct lib to build AWS Serverless infrastructure to orchestrate Redshift using AWS stepfunctions.';
const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new AwsCdkConstructLibrary({
  author: 'Peter Van Bouwel',
  authorAddress: 'pbbouwel@amazon.com',
  cdkVersion: AWS_CDK_VERSION,
  jsiiFqn: `aws-samples.${PROJECT_NAME}`,
  description: PROJECT_DESCRIPTION,
  name: PROJECT_NAME,
  repositoryUrl: 'https://github.com/aws-samples/cdk-stepfunctions-redshift.git',
  cdkVersionPinning: true,
  cdkDependencies: [
    '@aws-cdk/core',
    '@aws-cdk/aws-dynamodb',
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-events-targets',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-kms',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-lambda-event-sources',
    '@aws-cdk/aws-lambda-python',
    '@aws-cdk/aws-redshift',
    '@aws-cdk/aws-sqs',
    '@aws-cdk/aws-stepfunctions',
    '@aws-cdk/aws-stepfunctions-tasks',
    '@aws-cdk/aws-logs',
    '@aws-cdk/aws-events',
    '@aws-solutions-constructs/aws-events-rule-sqs',
    '@aws-solutions-constructs/aws-sqs-lambda',
    '@aws-solutions-constructs/aws-lambda-dynamodb',
  ],
  deps: ['properties-reader'],
  bundledDeps: ['properties-reader'],
  docgen: true,
  eslint: true,
  keywords: ['cdk', 'redshift', 'stepfunction', 'orchestration'],
  licensed: false,
  defaultReleaseBranch: 'main',
  pullRequestTemplateContents: [
    '---',
    '\nIssue #, if available:',
    '\nDescription of changes:',
    '\nBy submitting this pull request, I confirm that you can use, modify, copy, and redistribute this contribution, under the terms of your choice.',
  ],
});

const common_exclude = ['cdk.out', 'cdk.context.json', 'docker-compose.yml', 'yarn-error.log', '**/.idea', 'package-lock.json'];
project.npmignore.exclude(...common_exclude, '/codebase');
project.gitignore.exclude(...common_exclude);
project.synth();
