# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


import json
from datetime import date, datetime


def fallback_encoder(o):
    """
    Encoder when translating an object to JSON. Implements conversions for object datatypes not supported out of the
    box. Conversions:
     - date/datetime => ISO format datestring
    Args:
        o:

    Returns:

    """
    if isinstance(o, (date, datetime)):
        return o.isoformat()


def sanitize_response(response: object):
    """
    Make sure response structure can be converted to a valid JSON structure without issues. Actions it does:
     - Make sure datetimes are in ISO format
    Args:
        response:

    Returns:

    """
    return json.loads(json.dumps(response, default=fallback_encoder))
