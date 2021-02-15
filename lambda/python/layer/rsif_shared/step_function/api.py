# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import json
from rsif_shared.logger import logger, l_record, l_task_timed_out, l_task_token, l_item

QUERY_FINISHED = "FINISHED"
QUERY_FAILED = "FAILED"


class StepFunctionAPI(object):
    client = boto3.client('stepfunctions')

    @classmethod
    def send_outcome(cls, task_token: str, finished_event_details: dict):
        try:
            cls._send_outcome(task_token, finished_event_details, cls.get_outcome(finished_event_details))
        except cls.client.exceptions.TaskTimedOut as tto:
            # TaskTimedOut means task has already timed out or has been completed previously.
            logger.warn({
                l_record: finished_event_details,
                l_task_timed_out: tto
            })

    @classmethod
    def get_outcome(cls, finished_event_details: dict) -> str:
        return finished_event_details['detail']['state']

    @classmethod
    def _send_outcome(cls, task_token: str, finished_event_details: dict, state_outcome: str):
        if state_outcome == QUERY_FINISHED:
            cls.send_task_success(task_token, finished_event_details)
        elif state_outcome == QUERY_FAILED:
            cls.send_task_failure(task_token, finished_event_details)
        else:
            raise NotImplemented(f"Unsupported Data API finished event state {state_outcome}")

    @classmethod
    def send_task_success(cls, task_token: str, finished_event_details: dict):
        logger.debug({l_task_token: task_token, l_item: finished_event_details})
        cls.client.send_task_success(
            taskToken=task_token,
            output=json.dumps(finished_event_details)
        )

    @classmethod
    def send_task_failure(cls, task_token: str, finished_event_details: dict):
        logger.debug({l_task_token: task_token, l_item: finished_event_details})
        cls.client.send_task_failure(
            taskToken=task_token,
            error=QUERY_FAILED,
            cause=json.dumps(finished_event_details)
        )
