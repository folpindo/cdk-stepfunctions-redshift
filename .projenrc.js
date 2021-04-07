const { AwsCdkConstructLibrary } = require('projen');

const AWS_CDK_VERSION = '1.85.0';
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
    '@aws-cdk/aws-sam',
  ],
  deps: ['properties-reader'],
  bundledDeps: ['properties-reader'],
  docgen: true,
  eslint: true,
  keywords: ['cdk', 'redshift', 'stepfunction', 'orchestration'],
  licensed: false,
  defaultReleaseBranch: 'release',
  pullRequestTemplateContents: [
    '---',
    '\nIssue #, if available:',
    '\nDescription of changes:',
    '\nBy submitting this pull request, I confirm that you can use, modify, copy, and redistribute this contribution, under the terms of your choice.',
  ],
  dependabotOptions: {
    scheduleInterval: 'weekly',
    autoMerge: true,
  },
  publishToPypi: {
    module: 'cdk_stepfunctions_redshift',
    distName: PROJECT_NAME,
  },
  releaseWorkflow: false, // Will have custom release workflow
});

const common_exclude = ['cdk.out', 'cdk.context.json', 'docker-compose.yml', 'yarn-error.log', '**/.idea', 'package-lock.json'];
project.npmignore.exclude(...common_exclude, '/codebase');
project.gitignore.exclude(...common_exclude);
const isCdkVersionDefinedAsExpected = 'grep "^const AWS_CDK_VERSION =" .projenrc.js | wc -l | grep 1 >/dev/null';
const cdkVerMatch = project.addTask('cdk-ver-match', { condition: isCdkVersionDefinedAsExpected } );
cdkVerMatch.exec(' ' +
    '  grep \'"version": "\'"$(grep "^const AWS_CDK_VERSION" .projenrc.js | grep -o "[0-9]*\\.[0-9]*\\.")[0-9][0-9]*"\'"\' version.json 2>/dev/null' +
    '  || standard-version --release-as "$(grep "^const AWS_CDK_VERSION" .projenrc.js | grep -o "[0-9]*\\.[0-9]*\\.[0-9]*")"');

releaseWorkflow = project.github.addWorkflow('releaseWorkflow');
releaseWorkflow.on({
  push: { branches: ['release'] },
  workflow_dispatch: {},
});
releaseWorkflow.addJobs({
  build: {
    'runs-on': 'ubuntu-latest',
    'env': {
      CI: 'true',
    },
    'steps': [
      {
        name: 'Checkout',
        uses: 'actions/checkout@v2',
        with: {
          'fetch-depth': 0,
        },
      },
      {
        name: 'Install dependencies',
        run: 'yarn install --check-files --frozen-lockfile',
      },
      {
        name: 'Synthesize project files',
        run: 'npx projen',
      },
      {
        name: 'Anti-tamper check',
        run: 'git diff --exit-code',
      },
      {
        name: 'Set git identity',
        run: 'git config user.name "Auto-bump" && git config user.email "github-actions@github.com"',
      },
      {
        name: 'Make sure CDK major/minor version is matched, patch version can be different',
        run: 'npx projen cdk-ver-match',
      },
      {
        name: 'Bump to next version',
        run: 'npx projen bump',
      },
      {
        name: 'Build',
        run: 'npx projen build',
      },
      {
        name: 'Anti-tamper check',
        run: 'git diff --exit-code',
      },
      {
        name: 'Push commits',
        run: 'git push origin $BRANCH',
        env: {
          BRANCH: '${{ github.ref }}',
        },
      },
      {
        name: 'Push tags',
        run: 'git push --follow-tags origin $BRANCH',
        env: {
          BRANCH: '${{ github.ref }}',
        },
      },
      {
        name: 'Upload artifact',
        uses: 'actions/upload-artifact@v2.1.1',
        with: {
          name: 'dist',
          path: 'dist',
        },
      },
    ],
    'container': {
      image: 'jsii/superchain',
    },
  },
  release_npm: {
    'name': 'Release to NPM',
    'needs': 'build',
    'runs-on': 'ubuntu-latest',
    'container': {
      image: 'jsii/superchain',
    },
    'steps': [
      {
        name: 'Download build artifacts',
        uses: 'actions/download-artifact@v2',
        with: {
          name: 'dist',
          path: 'dist',
        },
      },
      {
        name: 'Release',
        run: 'npx -p jsii-release@latest jsii-release-npm',
        env: {
          NPM_TOKEN: '${{ secrets.NPM_TOKEN }}',
          NPM_DIST_TAG: 'latest',
          NPM_REGISTRY: 'registry.npmjs.org',
        },
      },
    ],
  },
  release_pypi: {
    'name': 'Release to PyPi',
    'needs': 'build',
    'runs-on': 'ubuntu-latest',
    'container': {
      image: 'jsii/superchain',
    },
    'steps': [
      {
        name: 'Download build artifacts',
        uses: 'actions/download-artifact@v2',
        with: {
          name: 'dist',
          path: 'dist',
        },
      },
      {
        name: 'Release',
        run: 'npx -p jsii-release@latest jsii-release-pypi',
        env: {
          TWINE_USERNAME: '${{ secrets.TWINE_USERNAME }}',
          TWINE_PASSWORD: '${{ secrets.TWINE_PASSWORD }}',
        },
      },
    ],
  },
});

project.synth();
