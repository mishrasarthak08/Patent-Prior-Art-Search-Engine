import logging
import sys

from asgi_correlation_id import correlation_id
from pythonjsonlogger import jsonlogger


def setup_logger():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Remove existing handlers to avoid duplicates
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)

    class CustomJsonFormatter(jsonlogger.JsonFormatter):
        def add_fields(self, log_record, record, message_dict):
            super().add_fields(log_record, record, message_dict)
            if not log_record.get("timestamp"):
                log_record["timestamp"] = self.formatTime(record, self.datefmt)
            if log_record.get("level"):
                log_record["level"] = log_record["level"].upper()
            else:
                log_record["level"] = record.levelname

            # Inject correlation ID
            cid = correlation_id.get()
            if cid:
                log_record["request_id"] = cid

    formatter = CustomJsonFormatter("%(timestamp)s %(level)s %(name)s %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger


def get_logger(name: str):
    return logging.getLogger(name)


# Initialize on import
setup_logger()
