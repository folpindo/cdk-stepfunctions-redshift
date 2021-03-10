# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


class ConcurrentExecution(Exception):
    """A statement that should be executed as a singleton was issued but already had an instance running."""


class InvalidRequest(Exception):
    """The request for the Lambda function could not be processed. Validate it adheres to the API."""


class ConfigurationError(Exception):
    """A configuration parameter is not provided or has an invalid value."""


class PreviousExecutionNotFound(Exception):
    """No previous execution for execution ARN found. Could be user error when using statementId: LATEST prior to any
    statement execution."""


class NoTrackedState(Exception):
    """DDB is not tracking state for a Statement name. This is unexpected."""
