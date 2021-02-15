// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


import { expect as expectCDK, countResources } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { SfnRedshiftTasker } from '../src';


test('Infrastructure single helper', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');
  new SfnRedshiftTasker(stack, 'MyTestConstruct',
    {
      redshiftTargetProps: {
        dbUser: 'admin',
        dbName: 'dev',
        clusterIdentifier: 'my-fake-cluster-identifier',
      },
    });
  // We expect a state table to be present.
  expectCDK(stack).to(countResources('AWS::DynamoDB::Table', 1));
  // We have a queue for processing events and a deadletter queue
  expectCDK(stack).to(countResources('AWS::SQS::Queue', 2));
  expectCDK(stack).to(countResources('AWS::Lambda::EventSourceMapping', 1));
  // We expect 2 Lambda function (1 for helper, 1 for log retention)
  expectCDK(stack).to(countResources('AWS::Lambda::Function', 2));
});

test('Infrastructure two helpers', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'TestStack');
  const tasker = new SfnRedshiftTasker(stack, 'MyTestConstruct',
    {
      redshiftTargetProps: {
        dbUser: 'admin',
        dbName: 'dev',
        clusterIdentifier: 'my-fake-cluster-identifier',
      },
    });
  new SfnRedshiftTasker(stack, 'MyTestConstruct2',
    {
      redshiftTargetProps: {
        dbUser: 'admin',
        dbName: 'dev',
        clusterIdentifier: 'my-fake-cluster-identifier',
      },
      createCallbackInfra: false, //When adding a 2nd helper do not setup callback infra.
      existingTableObj: tasker.trackingTable,
    });
  // We expect a state table to be present.
  expectCDK(stack).to(countResources('AWS::DynamoDB::Table', 1));
  // We have a queue for processing events and a deadletter queue
  expectCDK(stack).to(countResources('AWS::SQS::Queue', 2));
  expectCDK(stack).to(countResources('AWS::Lambda::EventSourceMapping', 1));
  // We expect 3 Lambda functions one for each helper and 1 for log retention.
  expectCDK(stack).to(countResources('AWS::Lambda::Function', 3));
});