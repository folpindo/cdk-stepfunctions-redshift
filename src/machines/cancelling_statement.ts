// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as cdk from '@aws-cdk/core';
import { RetryableLambdaInvoke } from './util';


export class CancellingStatementMachine {
  public readonly definition: sfn.StateMachine;

  create_udf_slow = `
      create or replace function public.f_slow(str_in varchar(50), int_in int)
      RETURNS varchar(50)
      stable AS $$
        import time
        time.sleep(int_in)
        return str_in
      $$ LANGUAGE plpythonu;
  `;

  constructor(scope: cdk.Construct, lambdaFunction: lambda.Function) {

    let cancelingSucceeded = new sfn.Succeed(scope, 'cancelingSucceeded');
    let cancelingFailed = new sfn.Fail(scope, 'cancelingFailed');

    let setupPreReqsCancelRSStatement = new RetryableLambdaInvoke(
      scope, 'provideUdfSlowExecution', {
        lambdaFunction: lambdaFunction,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          'taskToken': sfn.JsonPath.taskToken,
          'executionArn.$': '$$.Execution.Id',
          'sqlStatement': this.create_udf_slow,
        }),
        heartbeat: cdk.Duration.seconds(3600),
        resultPath: '$.executionDetails',
      },
    ).addCatch(cancelingFailed, { errors: ['States.ALL'] });

    let cancelSlowQuery = new RetryableLambdaInvoke(
      scope, 'cancelSlowQuery', {
        lambdaFunction: lambdaFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          'statementId': 'LATEST',
          'executionArn.$': '$$.Execution.Id',
          'action': 'cancelStatement',
        }),
        resultPath: '$.executionCancelDetails',
      },
    ).addCatch(cancelingFailed, { errors: ['States.ALL'] });

    let startSlowQuery = new RetryableLambdaInvoke(
      scope, 'startSlowQuery', {
        lambdaFunction: lambdaFunction,
        integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
        payload: sfn.TaskInput.fromObject({
          'taskToken': sfn.JsonPath.taskToken,
          'executionArn.$': '$$.Execution.Id',
          'sqlStatement': 'select public.f_slow(getdate()::varchar(50), 600)', //Should run for 10 minutes
        }),
        heartbeat: cdk.Duration.seconds(10),
        resultPath: '$.executionDetails',
      },
    ).addCatch(cancelSlowQuery, { errors: ['States.Timeout'] },
    ).addCatch(cancelingFailed, { errors: ['States.ALL'] },
    ).next(cancelingFailed); // We should not normally transition because heartbeat < statement duration

    setupPreReqsCancelRSStatement.next(startSlowQuery);

    let describeCanceledSlowQuery = new RetryableLambdaInvoke(
      scope, 'describeCanceledSlowQuery', {
        lambdaFunction: lambdaFunction,
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          'statementId': 'LATEST',
          'executionArn.$': '$$.Execution.Id',
          'action': 'describeStatement',
        }),
        resultPath: '$.executionDetails',
      },
    ).addCatch(cancelingFailed, { errors: ['States.ALL'] });
    cancelSlowQuery.next(describeCanceledSlowQuery);

    let verifyCanceledQuery = new sfn.Choice(scope, 'verifyCancelledQuery', {},
    ).when(
      sfn.Condition.booleanEquals('$.executionCancelDetails.Status', false),
      cancelingFailed,
    ).when(
      //If query  still in started state then retry describe (better to have retry backoff mechanism)
      sfn.Condition.stringEquals('$.executionDetails.Status', 'STARTED'),
      describeCanceledSlowQuery,
    ).when(
      sfn.Condition.not(sfn.Condition.stringEquals('$.executionDetails.Status', 'ABORTED')),
      cancelingFailed,
    ).otherwise(cancelingSucceeded);

    describeCanceledSlowQuery.next(verifyCanceledQuery);

    this.definition = new sfn.StateMachine(
      scope, 'CancelRsTask', {
        definition: setupPreReqsCancelRSStatement,
      },
    );
  }
}