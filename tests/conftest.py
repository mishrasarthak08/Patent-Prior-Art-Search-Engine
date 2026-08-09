import os

import pytest


@pytest.fixture(autouse=True)
def mock_env_vars():
    """Mock environment variables needed for tests to pass without crashing on collection."""
    os.environ["GOOGLE_API_KEY"] = "dummy_test_key"
    os.environ["COHERE_API_KEY"] = "dummy_cohere_key"
    yield


def pytest_configure(config):
    """Set env vars before any modules are imported to prevent collection failures."""
    os.environ["GOOGLE_API_KEY"] = "dummy_test_key"
    os.environ["COHERE_API_KEY"] = "dummy_cohere_key"
