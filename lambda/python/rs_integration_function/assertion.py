# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


import os


def assert_env_set(env_variable_name: str):
    assert env_variable_name in os.environ, f"Missing {env_variable_name} env variable for the function."
