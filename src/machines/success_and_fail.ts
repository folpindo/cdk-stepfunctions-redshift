// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from '@aws-cdk/core';
import { RetryableLambdaInvoke } from './util';


export class SuccessAndFailMachine {
  public readonly definition: sfn.StateMachine;

  constructor(scope: cdk.Construct, lambdaFunction: lambda.Function) {
    let successState = new sfn.Succeed(scope, 'Succeed');
    let failureState = new sfn.Fail(scope, 'Failure');

    let startRsTaskProcedure = new RetryableLambdaInvoke(
      scope, 'StartRedshiftStatementAndWaitForCallback', {
        lambdaFunction: lambdaFunction,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          'taskToken': sfn.JsonPath.taskToken,
          'executionArn.$': '$$.Execution.Id',
          'sqlStatement': 'select getdate()',
        }),
        heartbeat: cdk.Duration.seconds(3600),
      },
    );

    startRsTaskProcedure.addCatch(
      failureState,
      { errors: ['States.ALL'] },
    );

    let startInvalidRsTaskProcedure = new RetryableLambdaInvoke(
      scope, 'StartInvalidRedshiftStatementAndWaitForCallback', {
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
    startRsTaskProcedure.next(startInvalidRsTaskProcedure);

    startInvalidRsTaskProcedure.addCatch(
      successState,
      { errors: ['FAILED'] },
    );

    //Completion of startInvalidRsTaskProcedure would be a bug.
    startInvalidRsTaskProcedure.next(failureState);

    this.definition = new sfn.StateMachine(
      scope, 'ExampleStateMachineRSIntegration', {
        definition: startRsTaskProcedure,
      },
    );

  }
}