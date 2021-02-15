## Welcome to the cdk-stepfunctions-redshift project!

`cdk-stepfunctions-redshift` provides `SfnRedshiftTasker` which is a JSII construct library to build AWS Serverless
infrastructure to easily orchestrate Amazon Redshift using AWS stepfunctions.

When you deploy a `SfnRedshiftTasker` you will get:
- A Lambda function for invoking tasks on an Amazon Redshift cluster
- A DDB Table to track ongoing-executions
- An Event rule to monitor Amazon Redshift Data API completion events and route them to SQS
- An SQS queue to receive above mentioned Amazon Redshift Data API completion events  
- A Lambda function to process API Completions events (by default same function as the one above)
- A KMS key which encrypts data at rest.

This allows to easily create step-function tasks which execute a SQL command and will only complete
once Amazon Redshift finishes executing the corresponding statement.

## How it works
Serverless infrastructure will be spawn up for a specific (cluster, user, database). A Lambda function will be provided
which allows invoking statements as this user.  States can then be used to do a seemingly synchronous invocation of a
Amazon Redshift statement allowing your statemachines to have a simpler definition (see
[Example definition](README.md#example-definition-of-a-step-function-that-uses-the-exposed-lambda-function) for an example).

### Example flow
![alt text](images/aws-step-function-redshift-integration.png?raw=1 "Visualization completion.")

1. A step-function step triggers the Lambda function provided by the construct. The step function step follows a
   structure for its invocation payload which includes designated fields of (SQL statement to execute, Step function
   task_token, Step function execution ARN)

2. The Lambda function will generate a unique ID based on the execution ARN and register the SQL invocation in a
   DynamoDB state table.

3. The lambda function then starts the statement using the Amazon Redshift data API using the Unique ID as statement
   name and requesting events for state changes.

4. As a result of step 3 Amazon Redshift executes the statement. Once that statement completes it emits an event. Our 
   building blocks have put in place a Cloudwatch Rule to monitor these events.

5. The event gets placed into an SQS queue

6. This SQS queue is monitored by a Lambda function (could be the same as the previous one).

7. The Lambda function will check whether the finished query is related to a step function invocation in order to
   retrieve the task token of the step.

8. If it is then it will do a succeed/fail callback to the step-function step (using the task token) depending on
   success/failure of the SQL statement.

9. It will mark the invocation as processed in the state table.


## Example definition of a step function that uses the exposed lambda function
A state definition mostly comprises boiler plate code and
looks like:
```json
{
  "StateName": {
    "Type": "Task",
    "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
    "Parameters": {
      "FunctionName": "arn:aws:lambda:REGION:ACCOUNT_ID:function:FUNCTION_NAME",
      "Payload": {
        "taskToken.$": "$$.Task.Token",
        "executionArn.$": "$$.Execution.Id",
        "sqlStatement": "SQL_STATEMENT"
      }
    },
    "HeartbeatSeconds": 3600,
    "Next": "SUCCESS",
    "Catch": [
      {
         "ErrorEquals": [
            "States.Timeout"
         ],
         "Next": "cancelSlowQuery"
      },
      {
         "ErrorEquals": [
            "FAILED"
         ],
         "Next": "SQL_FAILURE"
      }, 
      {
        "ErrorEquals": [
          "States.ALL"
        ],
        "Next": "FAILURE"
      }
    ],
    "Retry": [
      {
        "ErrorEquals": [
          "Lambda.ServiceException",
          "Lambda.AWSLambdaException",
          "Lambda.SdkClientException"
        ],
        "IntervalSeconds": 2,
        "MaxAttempts": 6,
        "BackoffRate": 2
      },
      {
         "ErrorEquals": [
            "Lambda.TooManyRequestsException"
         ],
         "IntervalSeconds": 1,
         "MaxAttempts": 10,
         "BackoffRate": 1.5
      }
    ]
  }
}
```
Values that you want to fine tune per state:
- SQL_STATEMENT: The SQL statement that you want to run. If you want to run multiple statements in one go you should
  have it defined as a procedure on Amazon Redshift and you should call the procedure.
- 3600 (HeartbeatSeconds): How long the state will wait for feedback from the query (Note: maximum runtime is 24 hours,
  as per Amazon Redshift Data API).
- SUCCESS (Next): Name of the next state if the query execution succeeds.
- SQL_FAILURE (Catch.Next): Name of the next state if query execution fails.
- FAILURE (Catch.Next): Name of the next state if something else failed.

Values that depend on the deployment:
- REGION : AWS region in which is deployed e.g.: `eu-west-1`
- ACCOUNT_ID: Account ID in which we have this deployed e.g.: `012345678910`
- FUNCTION_NAME: The name of the function created by SfnRedshiftTasker (i.e.: `lambdaFunction` property)

### Retry logic
The provided Lambda function has a very limited running time. By default a concurrency of 1 is allowed therefore it is
recommended to aggressively retry throttled requests (`Lambda.TooManyRequestsException`). For other exceptions retry
mechanisms can be less aggressive. This is illustrated in the above example.

### Timeout
You can set a time budget using the `HeartbeatSeconds` parameter. If that time has passed a `States.Timeout` exception
is thrown which can be caught in order to implement custom handling. In the above example a timeout would result in
triggering the `cancelSlowQuery` state.

## How to use
This is a construct so you can use it from a CDK Stack. An example stack can be found at [integ.default.ts](src/integ.default.ts)
.  That stack sets up an Amazon Redshift cluster, the `SfnRedshiftTasker` infra and some state machines that use the 
functionality. It can be launched by compiling the code (which creates a lib directory) and deploying the CDK app: 
`yarn compile && npx cdk --app ./lib/integ.default.js deploy`

### Considerations
When using this approach do keep in mind the considerations of the [Amazon Redshift Data API](
https://docs.aws.amazon.com/redshift/latest/mgmt/data-api.html#data-api-calling-considerations).

These shouldn't be blockers:
- If query result is too big consider using `UNLOAD` rather than `SELECT`.
- If the statement size is too big consider splitting up the statement in multiple statements. For example by
  defining and utilizing views or encapsulating the logic in a stored procedure.

### Handling of step timeout
Users can manually add a `Catch` for `States.Timeout`, which gets thrown after `HeartbeatSeconds` has passed. By
catching this exception they can transition to a state for handling this scenario.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
