# API Reference

**Classes**

Name|Description
----|-----------
[SfnRedshiftTasker](#cdk-stepfunctions-redshift-sfnredshifttasker)|Create infrastructure to easily create tasks in a Stepfunction that run a SQL statement on a Redshift cluster and await completion.


**Structs**

Name|Description
----|-----------
[RedshiftTargetProps](#cdk-stepfunctions-redshift-redshifttargetprops)|The details of the Redshift target in which you will execute SQL statements.
[SfnRedshiftTaskerProps](#cdk-stepfunctions-redshift-sfnredshifttaskerprops)|*No description*



## class SfnRedshiftTasker  <a id="cdk-stepfunctions-redshift-sfnredshifttasker"></a>

Create infrastructure to easily create tasks in a Stepfunction that run a SQL statement on a Redshift cluster and await completion.

__Implements__: [IConstruct](#constructs-iconstruct), [IConstruct](#aws-cdk-core-iconstruct), [IConstruct](#constructs-iconstruct), [IDependable](#aws-cdk-core-idependable)
__Extends__: [Construct](#aws-cdk-core-construct)

### Initializer


Creates the infrastructure to allow stepfunction tasks that execute SQL commands and await their completion.

```ts
new SfnRedshiftTasker(scope: Construct, id: string, props: SfnRedshiftTaskerProps)
```

* **scope** (<code>[Construct](#aws-cdk-core-construct)</code>)  Scope within where this infrastructure is created.
* **id** (<code>string</code>)  Identifier to name this building block.
* **props** (<code>[SfnRedshiftTaskerProps](#cdk-stepfunctions-redshift-sfnredshifttaskerprops)</code>)  The configuration properties of the infrastructure.
  * **redshiftTargetProps** (<code>[RedshiftTargetProps](#cdk-stepfunctions-redshift-redshifttargetprops)</code>)  The details of the Redshift target in which you will execute SQL statements. 
  * **completerExistingLambdaObj** (<code>[Function](#aws-cdk-aws-lambda-function)</code>)  Existing instance of Lambda Function object that completes execution, if this is set then the completerLambdaFunctionProps is ignored. __*Default*__: None
  * **completerLambdaFunctionProps** (<code>[FunctionProps](#aws-cdk-aws-lambda-functionprops)</code>)  User provided props to override the default props for the Lambda function that completes execution. __*Default*__: Re-use starter Lambda function.
  * **createCallbackInfra** (<code>boolean</code>)  Setup the infrastructure to support the step function callback mechanism. __*Default*__: true
  * **deadLetterQueueProps** (<code>[QueueProps](#aws-cdk-aws-sqs-queueprops)</code>)  Optional user provided properties for the dead letter queue. __*Default*__: Default props are used
  * **deployDeadLetterQueue** (<code>boolean</code>)  Whether to deploy a secondary queue to be used as a dead letter queue. __*Default*__: true.
  * **dynamoTableProps** (<code>[TableProps](#aws-cdk-aws-dynamodb-tableprops)</code>)  Optional user provided props to override the default props. __*Default*__: Default props are used
  * **enableEncryptionWithCustomerManagedKey** (<code>boolean</code>)  Use a KMS Key, either managed by this CDK app, or imported. __*Default*__: true (encryption enabled, managed by this CDK app).
  * **enableQueuePurging** (<code>boolean</code>)  Whether to grant additional permissions to the Lambda function enabling it to purge the SQS queue. __*Default*__: "false", disabled by default.
  * **encryptionKey** (<code>[Key](#aws-cdk-aws-kms-key)</code>)  An optional, imported encryption key to encrypt the SQS queue, and SNS Topic. __*Default*__: not specified.
  * **encryptionKeyProps** (<code>[KeyProps](#aws-cdk-aws-kms-keyprops)</code>)  Optional user-provided props to override the default props for the encryption key. __*Default*__: Default props are used.
  * **existingQueueObj** (<code>[Queue](#aws-cdk-aws-sqs-queue)</code>)  Existing instance of SQS queue object, if this is set then the queueProps is ignored. __*Default*__: None
  * **existingTableObj** (<code>[Table](#aws-cdk-aws-dynamodb-table)</code>)  Existing instance of DynamoDB table object, If this is set then the dynamoTableProps is ignored. __*Default*__: None
  * **logLevel** (<code>string</code>)  Optional user provided props to override the shared layer. __*Default*__: None
  * **maxReceiveCount** (<code>number</code>)  The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue. __*Default*__: required field if deployDeadLetterQueue=true.
  * **queueProps** (<code>[QueueProps](#aws-cdk-aws-sqs-queueprops)</code>)  User provided props to override the default props for the SQS queue. __*Default*__: Default props are used
  * **starterExistingLambdaObj** (<code>[Function](#aws-cdk-aws-lambda-function)</code>)  Existing instance of Lambda Function object that starts execution, if this is set then the lambdaFunctionProps is ignored. __*Default*__: None
  * **starterLambdaFunctionProps** (<code>[FunctionProps](#aws-cdk-aws-lambda-functionprops)</code>)  User provided props to override the default props for the Lambda function that starts execution. __*Default*__: Default props are used
  * **tablePermissions** (<code>string</code>)  Optional table permissions to grant to the Lambda function. __*Default*__: Read/write access is given to the Lambda function if no value is specified.



### Properties


Name | Type | Description 
-----|------|-------------
**lambdaFunction** | <code>[Function](#aws-cdk-aws-lambda-function)</code> | The Lambda function which can be used from a Step function task to invoke a SQL statement.
**trackingTable** | <code>[Table](#aws-cdk-aws-dynamodb-table)</code> | A state table that tracks the Redshift statements being executed.



## struct RedshiftTargetProps  <a id="cdk-stepfunctions-redshift-redshifttargetprops"></a>


The details of the Redshift target in which you will execute SQL statements.



Name | Type | Description 
-----|------|-------------
**clusterIdentifier** | <code>string</code> | The cluster identifier (name) in which the SQL statement will be executed.
**dbName** | <code>string</code> | The Redshift database name in which the SQL statement will be executed.
**dbUser** | <code>string</code> | The Redshift database user that will execute the Redshift tasks.



## struct SfnRedshiftTaskerProps  <a id="cdk-stepfunctions-redshift-sfnredshifttaskerprops"></a>






Name | Type | Description 
-----|------|-------------
**redshiftTargetProps** | <code>[RedshiftTargetProps](#cdk-stepfunctions-redshift-redshifttargetprops)</code> | The details of the Redshift target in which you will execute SQL statements.
**completerExistingLambdaObj**? | <code>[Function](#aws-cdk-aws-lambda-function)</code> | Existing instance of Lambda Function object that completes execution, if this is set then the completerLambdaFunctionProps is ignored.<br/>__*Default*__: None
**completerLambdaFunctionProps**? | <code>[FunctionProps](#aws-cdk-aws-lambda-functionprops)</code> | User provided props to override the default props for the Lambda function that completes execution.<br/>__*Default*__: Re-use starter Lambda function.
**createCallbackInfra**? | <code>boolean</code> | Setup the infrastructure to support the step function callback mechanism.<br/>__*Default*__: true
**deadLetterQueueProps**? | <code>[QueueProps](#aws-cdk-aws-sqs-queueprops)</code> | Optional user provided properties for the dead letter queue.<br/>__*Default*__: Default props are used
**deployDeadLetterQueue**? | <code>boolean</code> | Whether to deploy a secondary queue to be used as a dead letter queue.<br/>__*Default*__: true.
**dynamoTableProps**? | <code>[TableProps](#aws-cdk-aws-dynamodb-tableprops)</code> | Optional user provided props to override the default props.<br/>__*Default*__: Default props are used
**enableEncryptionWithCustomerManagedKey**? | <code>boolean</code> | Use a KMS Key, either managed by this CDK app, or imported.<br/>__*Default*__: true (encryption enabled, managed by this CDK app).
**enableQueuePurging**? | <code>boolean</code> | Whether to grant additional permissions to the Lambda function enabling it to purge the SQS queue.<br/>__*Default*__: "false", disabled by default.
**encryptionKey**? | <code>[Key](#aws-cdk-aws-kms-key)</code> | An optional, imported encryption key to encrypt the SQS queue, and SNS Topic.<br/>__*Default*__: not specified.
**encryptionKeyProps**? | <code>[KeyProps](#aws-cdk-aws-kms-keyprops)</code> | Optional user-provided props to override the default props for the encryption key.<br/>__*Default*__: Default props are used.
**existingQueueObj**? | <code>[Queue](#aws-cdk-aws-sqs-queue)</code> | Existing instance of SQS queue object, if this is set then the queueProps is ignored.<br/>__*Default*__: None
**existingTableObj**? | <code>[Table](#aws-cdk-aws-dynamodb-table)</code> | Existing instance of DynamoDB table object, If this is set then the dynamoTableProps is ignored.<br/>__*Default*__: None
**logLevel**? | <code>string</code> | Optional user provided props to override the shared layer.<br/>__*Default*__: None
**maxReceiveCount**? | <code>number</code> | The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.<br/>__*Default*__: required field if deployDeadLetterQueue=true.
**queueProps**? | <code>[QueueProps](#aws-cdk-aws-sqs-queueprops)</code> | User provided props to override the default props for the SQS queue.<br/>__*Default*__: Default props are used
**starterExistingLambdaObj**? | <code>[Function](#aws-cdk-aws-lambda-function)</code> | Existing instance of Lambda Function object that starts execution, if this is set then the lambdaFunctionProps is ignored.<br/>__*Default*__: None
**starterLambdaFunctionProps**? | <code>[FunctionProps](#aws-cdk-aws-lambda-functionprops)</code> | User provided props to override the default props for the Lambda function that starts execution.<br/>__*Default*__: Default props are used
**tablePermissions**? | <code>string</code> | Optional table permissions to grant to the Lambda function.<br/>__*Default*__: Read/write access is given to the Lambda function if no value is specified.



