// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from '@aws-cdk/core';
import { RetryableLambdaInvoke } from './util';


export class SingleSuccessMachine {
  public readonly definition: sfn.StateMachine;

  constructor(scope: cdk.Construct, lambdaFunction: lambda.Function) {
    let successState1 = new sfn.Succeed(scope, 'Succeed1');
    let failureState1 = new sfn.Fail(scope, 'Failure1');
    let simpleSuccessfullRsTaskProcedure = new RetryableLambdaInvoke(
      scope, 'SimpleSuccessfullRsTaskProcedure', {
        lambdaFunction: lambdaFunction,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          'taskToken': sfn.JsonPath.taskToken,
          'executionArn.$': '$$.Execution.Id',
          'sqlStatement': 'select getdate()',
        }),
        heartbeat: cdk.Duration.seconds(3600),
        resultPath: '$.executionDetails',
      },
    );
    let simpleSuccessfullRsTaskGetResult = new RetryableLambdaInvoke(
      scope, 'simpleSuccessfullRsTaskGetResult', {
        lambdaFunction: lambdaFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          // When using callback the structure is following the Redshift Data Statement Status Change format.
          'statementId': 'LATEST',
          'executionArn.$': '$$.Execution.Id',
          'action': 'getStatementResult',
        }),
        heartbeat: cdk.Duration.seconds(3600),
        resultPath: '$.executionResult',
      },
    );
    simpleSuccessfullRsTaskProcedure.next(simpleSuccessfullRsTaskGetResult);
    simpleSuccessfullRsTaskGetResult.next(successState1);
    simpleSuccessfullRsTaskProcedure.addCatch(
      failureState1,
      { errors: ['States.ALL'] },
    );
    this.definition = new sfn.StateMachine(
      scope, 'SimpleStateMachineSuccessRSCallbackIntegration', {
        definition: simpleSuccessfullRsTaskProcedure,
      },
    );
  }
}