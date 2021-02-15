// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


import { IChainable, IntegrationPattern, StateMachine, Succeed } from '@aws-cdk/aws-stepfunctions';
import { StepFunctionsStartExecution } from '@aws-cdk/aws-stepfunctions-tasks';
import * as cdk from '@aws-cdk/core';


export class ChainedMachine {
  private readonly scope: cdk.Construct;
  private prev: IChainable;

  constructor(scope: cdk.Construct) {
    this.scope = scope;
    this.prev = new Succeed(scope, 'chainedTestSuccess');
  }

  /**
   * Add machine to the front of the chained machines such that it is the first chain.
   * @param name
   * @param machine
   */
  push_front(name: string, machine: StateMachine) {
    let new_task = new StepFunctionsStartExecution(this.scope, name, {
      integrationPattern: IntegrationPattern.RUN_JOB,
      stateMachine: machine,
    });
    new_task.next(this.prev);
    this.prev = new_task;
  }

  build() {
    return new StateMachine(
      this.scope, 'chainedMachines', {
        definition: this.prev,
      },
    );
  }
}