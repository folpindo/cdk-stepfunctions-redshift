// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from '@aws-cdk/core';
import { RetryableLambdaInvoke } from './util';


export class PollingMachine {
  public readonly definition: sfn.StateMachine;

  constructor(scope: cdk.Construct, lambdaFunction: lambda.Function) {
    let statementFailed1 = new sfn.Fail(scope, 'StatementFailed_');
    let statementSucceeded1 = new sfn.Succeed(scope, 'StatementSucceeded_');


    let executeBeforePollingRsTaskProcedure = new RetryableLambdaInvoke(
      scope, 'executeBeforePolling', {
        lambdaFunction: lambdaFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          sqlStatement: 'select public.f_slow(getdate()::varchar(50), 60)',
        }),
        heartbeat: cdk.Duration.seconds(300),
        resultPath: '$.executionDetails',
      },
    );
    executeBeforePollingRsTaskProcedure.addCatch(
      statementFailed1, { errors: ['States.ALL'] },
    );
    let waitBetweenPolls = new sfn.Wait(scope, 'WaitBetweenPolls', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(10)),
    });
    executeBeforePollingRsTaskProcedure.next(waitBetweenPolls);
    let checkExecutionStateRSTask = new RetryableLambdaInvoke(
      scope, 'checkExecutionStateRSTask', {
        lambdaFunction: lambdaFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          'statementId.$': '$.executionDetails.Id',
          'action': 'describeStatement',
        }),
        heartbeat: cdk.Duration.seconds(300),
        resultPath: '$.executionDetails',
      },
    );
    waitBetweenPolls.next(checkExecutionStateRSTask);

    let choiceExecutionResult = new sfn.Choice(scope, 'choiceExecutionResult', {}).when(
      sfn.Condition.stringEquals('$.executionDetails.Status', 'FINISHED'),
      statementSucceeded1,
    ).when(
      sfn.Condition.stringEquals('$.executionDetails.Status', 'ABORTED'),
      statementFailed1,
    ).when(
      sfn.Condition.stringEquals('$.executionDetails.Status', 'FAILED'),
      statementFailed1,
    ).otherwise(waitBetweenPolls);

    checkExecutionStateRSTask.next(choiceExecutionResult);

    this.definition = new sfn.StateMachine(
      scope, 'PollingRsTask', {
        definition: executeBeforePollingRsTaskProcedure,
      },
    );
  }
}