import logging
import os
import threading

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_current_key_idx = 0
API_KEYS: list[str] = []


def init_keys():
    global API_KEYS
    if not API_KEYS:
        # Check environment first
        env_key = os.environ.get("GOOGLE_API_KEY")
        if env_key and env_key not in API_KEYS:
            API_KEYS.append(env_key)

        # User-provided fallback keys
        additional_keys = ["AIzaSyCCit9ukSeaXAZtl9QVnghyhnKsIQk3e9M", "AIzaSyAC1K0FPNU4zVGImWuY04_7_g5pIHqR3T4"]

        for key in additional_keys:
            if key not in API_KEYS:
                API_KEYS.append(key)


def get_current_api_key() -> str:
    init_keys()
    with _lock:
        if not API_KEYS:
            return ""
        return API_KEYS[_current_key_idx % len(API_KEYS)]


def rotate_api_key(failed_key: str) -> str:
    global _current_key_idx
    init_keys()

    if not API_KEYS:
        return ""

    with _lock:
        current_key = API_KEYS[_current_key_idx % len(API_KEYS)]
        # If the key hasn't been rotated by another thread yet, rotate it
        if current_key == failed_key:
            _current_key_idx += 1
            new_key = API_KEYS[_current_key_idx % len(API_KEYS)]
            os.environ["GOOGLE_API_KEY"] = new_key
            logger.warning(f"Quota error hit. Rotated Google API Key to index {_current_key_idx % len(API_KEYS)}")
            return new_key
        # Otherwise it was already rotated
        return current_key


def get_all_keys() -> list[str]:
    init_keys()
    return API_KEYS
