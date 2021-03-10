# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


import json
import traceback

from aws_lambda_powertools.utilities.batch import sqs_batch_processor
from ddb.ddb_state_table import DDBStateTable
from exceptions import ConcurrentExecution, InvalidRequest
from integration import sanitize_response
from logger import logger, l_sanitized_response, l_response, l_record, l_message, l_traceback, l_exception
from environment_labels import env_variable_labels
from event_labels import (
    TASK_TOKEN, EXECUTION_ARN, SQL_STATEMENT, STATEMENT_ID, ACTION, DESCRIBE_STATEMENT, GET_STATEMENT_RESULT,
    NEXT_TOKEN, CANCEL_STATEMENT, EXECUTE_SINGLETON_STATEMENT, EXECUTE_STATEMENT
)
from assertion import assert_env_set
from redshift_data.api import describe_statement, \
    get_statement_result, cancel_statement, get_statement_id_for_statement_name, execute_statement, \
    is_statement_in_active_state
from statement_class import StatementName
from step_function.api import StepFunctionAPI

for env_variable_label in env_variable_labels:
    assert_env_set(env_variable_label)

ddb_sfn_state_table = DDBStateTable()


def handler(event: dict, context):
    """
    The entry point of an execution only task is to guarantee that returned object is JSON serializable.
    """
    sanitized_response = sanitize_response(_handler(event, context))
    logger.debug({l_sanitized_response: sanitized_response})
    return sanitized_response


def get_statement_id(event: dict) -> str:
    """
    For statementId we support a placeholder VALUE 'LATEST' which will resolve the id of the latest statement issued
    form the statemachine with executionArn.
    """
    provided_statement_id = event[STATEMENT_ID]
    if provided_statement_id == 'LATEST':
        assert EXECUTION_ARN in event, f"The field {EXECUTION_ARN} is mandatory for {STATEMENT_ID}='LATEST'!"
        statement_name = ddb_sfn_state_table.get_latest_statement_name_for_execution_arn(event[EXECUTION_ARN])
        return get_statement_id_for_statement_name(str(statement_name))
    else:
        return provided_statement_id


def _handler(event: dict, context):
    logger.structure_logs(append=True, function="pre_routing")
    logger.debug(event)
    if "Records" in event:
        logger.structure_logs(append=True, function="complete_statement")
        # This event is an SQS record so this is a finished Redshift Data API event
        return sqs_finished_data_api_request_handler(event, context)
    elif SQL_STATEMENT in event:
        logger.structure_logs(append=True, function="execute_statement")
        return handle_redshift_statement_invocation_event(event)
    elif STATEMENT_ID in event and ACTION in event and event[ACTION] == DESCRIBE_STATEMENT:
        logger.structure_logs(append=True, function="describe_statement")
        return describe_statement(get_statement_id(event))
    elif STATEMENT_ID in event and ACTION in event and event[ACTION] == GET_STATEMENT_RESULT:
        logger.structure_logs(append=True, function="get_statement_result")
        return get_statement_result(get_statement_id(event), next_token=event.get(NEXT_TOKEN))
    elif STATEMENT_ID in event and ACTION in event and event[ACTION] == CANCEL_STATEMENT:
        logger.structure_logs(append=True, function="cancel_statement")
        return cancel_statement(get_statement_id(event))
    else:
        raise InvalidRequest(f"Unsupported invocation event {event}.")


def handle_redshift_statement_invocation_event(event):
    assert SQL_STATEMENT in event, f"Programming error should never handle invocation without SQL_STATEMENT {event}."
    logger.info(event)
    task_token = event.get(TASK_TOKEN)
    execution_arn = event.get(EXECUTION_ARN)
    sql_statement = event[SQL_STATEMENT]
    action = event.get(ACTION)
    if action == EXECUTE_SINGLETON_STATEMENT or action == EXECUTE_STATEMENT or action is None:
        run_as_singleton = action == EXECUTE_SINGLETON_STATEMENT
        return handle_redshift_statement_invocation(sql_statement, task_token, execution_arn, run_as_singleton)
    else:
        raise InvalidRequest(f"Unsupported {ACTION} to execute sql_statement {event}")


def handle_redshift_statement_invocation(sql_statement: str, task_token: str = None, execution_arn: str = None,
                                         run_as_singleton=False):
    if run_as_singleton and is_statement_in_active_state(sql_statement):
        raise ConcurrentExecution(f"There is already an instance of {sql_statement} running.")
    statement_name = ddb_sfn_state_table.register_execution_start(task_token, execution_arn, sql_statement)
    response = execute_statement(sql_statement, str(statement_name), with_event=task_token is not None)
    logger.info({
        l_response: response,
        EXECUTION_ARN: execution_arn
    })
    return response


def finished_data_api_request_record_handler(record: dict):
    """
    This will be called for each finished invocation.
    It should raise an exception if the message was not processed successfully so we don't catch any exceptions
    and if we would we should be able to handle it or re-raise.

    Args:
        record: Has 'body' as json string of event documented in section ata-api-monitoring-events-finished on
                https://docs.aws.amazon.com/redshift/latest/mgmt/data-api-monitoring-events.html

    Returns:
        None:
    """
    try:
        logger.debug(record)
        finished_event_details_str = record['body']
        finished_event_details = json.loads(finished_event_details_str)
        execution_detail = finished_event_details['detail']
        statement_name = StatementName.from_str(execution_detail['statementName'])

        task_token = ddb_sfn_state_table.get_task_token_for_statement_name(statement_name)
        StepFunctionAPI.send_outcome(task_token, finished_event_details)

        ddb_sfn_state_table.mark_statement_name_as_handled(statement_name, finished_event_details)
    except StatementName.NoSfnStatementName:
        logger.info({
            l_record: record,
            l_message: "This record was not started by a system that tracks state. No need to process."
        })
    except Exception as e:
        logger.fatal({
            l_record: record,
            l_exception: e,
            l_traceback: traceback.format_exc()
        })
        raise e


@sqs_batch_processor(record_handler=finished_data_api_request_record_handler)
def sqs_finished_data_api_request_handler(event, context):
    logger.debug({"event": event, "context": context})
    return {"statusCode": 200}
