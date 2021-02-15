// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


import { LambdaInvoke, LambdaInvokeProps } from '@aws-cdk/aws-stepfunctions-tasks';
import { Duration, Construct } from '@aws-cdk/core';

function enableThrottlingRetry(task: LambdaInvoke) {
  task.addRetry({
    errors: ['Lambda.TooManyRequestsException'], backoffRate: 1.5, interval: Duration.seconds(1), maxAttempts: 10,
  });
  return task;
}

export class RetryableLambdaInvoke extends LambdaInvoke {
  constructor(scope: Construct, id: string, props: LambdaInvokeProps) {
    super(scope, id, props);
    enableThrottlingRetry(this);
  }
}