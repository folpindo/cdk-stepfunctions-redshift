// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from '@aws-cdk/core';
import { RetryableLambdaInvoke } from './util';


export class SingleFailureMachine {
  public readonly definition: sfn.StateMachine;

  constructor(scope: cdk.Construct, lambdaFunction: lambda.Function) {
    let testFailed = new sfn.Fail(scope, 'testFailed');
    let testSucceeded = new sfn.Succeed(scope, 'testSucceeded');
    let simpleFailurefullRsTaskProcedure = new RetryableLambdaInvoke(
      scope, 'SimpleFailureRsTaskProcedure', {
        lambdaFunction: lambdaFunction,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          'taskToken': sfn.JsonPath.taskToken,
          'executionArn.$': '$$.Execution.Id',
          'sqlStatement': 'select get_date()',
        }),
        heartbeat: cdk.Duration.seconds(3600),
      },
    );
    let simpleFailureDescribeTaskProcedure = new RetryableLambdaInvoke(
      scope, 'simpleFailureDescribeTaskProcedure', {
        lambdaFunction: lambdaFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          'statementId': 'LATEST',
          'executionArn.$': '$$.Execution.Id',
          'action': 'describeStatement',
        }),
        heartbeat: cdk.Duration.seconds(3600),
      },
    );
    simpleFailurefullRsTaskProcedure.next(testFailed);
    simpleFailurefullRsTaskProcedure.addCatch(simpleFailureDescribeTaskProcedure, { errors: ['FAILED'] });
    simpleFailurefullRsTaskProcedure.addCatch(
      testFailed,
      { errors: ['States.ALL'] },
    );
    simpleFailureDescribeTaskProcedure.next(testSucceeded);
    this.definition = new sfn.StateMachine(
      scope, 'SimpleFailureRsTaskProcedureCallbackIntegration', {
        definition: simpleFailurefullRsTaskProcedure,
      },
    );
  }
}