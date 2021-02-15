// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


import * as lambda from '@aws-cdk/aws-lambda';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import { Construct, Duration } from '@aws-cdk/core';
import { RetryableLambdaInvoke } from './util';


export class ParallelNoConcurrencyMachine {
  public readonly definition: sfn.StateMachine;

  constructor(scope: Construct, lambdaFunction: lambda.Function) {
    function createSlowSync(_scope: Construct, i: string) {
      let testFail = new sfn.Fail(_scope, `testFail${i}`);
      let successRun = new sfn.Succeed(_scope, `successParallel${i}`);
      let successAlreadyRunning = new sfn.Succeed(_scope, `successAlreadyRunning${i}`);

      return new RetryableLambdaInvoke(
        _scope, `startSlowQuery${i}`, {
          lambdaFunction: lambdaFunction,
          integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
          payload: sfn.TaskInput.fromObject({
            'taskToken': sfn.JsonPath.taskToken,
            'executionArn.$': '$$.Execution.Id',
            'sqlStatement': 'select public.f_slow(getdate()::varchar(50), 59)', //Should run for 1 minutes
            'action': 'executeSingletonStatement',
          }),
          heartbeat: Duration.seconds(300),
          resultPath: '$.executionDetails',
        },
      ).addCatch(successAlreadyRunning, { errors: ['ConcurrentExecution'] }, // ConcurrentExecutions are expected
      ).addCatch(testFail, { errors: ['States.Timeout'] }, // We don't expect timeout on RS cluster
      ).addCatch(testFail, { errors: ['States.ALL'] }, // We don't expect any other failure
      ).next(successRun);
    }

    let launchParallelTasks = new sfn.Parallel(scope, 'parallelExecutions', { resultPath: '$.results' });
    for (let i=0; i< 10; i++) {
      launchParallelTasks.branch(createSlowSync(scope, i.toString()));
    }

    this.definition = new sfn.StateMachine(
      scope, 'ParallelExecutions', {
        definition: launchParallelTasks,
      },
    );

  }
}