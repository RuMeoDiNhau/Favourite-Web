import os
import logging
from pathlib import Path
import boto3
import watchtower
from dotenv import load_dotenv

# Set up base directory and load .env
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=BASE_DIR / ".env")

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "ap-southeast-2")

# Create logger
logger = logging.getLogger("fav_web_logger")
logger.setLevel(logging.INFO)

# Avoid adding multiple handlers if already initialized
if not logger.handlers:
    # 1. Console Handler (fallback)
    console_handler = logging.StreamHandler()
    console_formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # 2. AWS CloudWatch Logs Handler
    # Prioritize boto3 IAM role credentials on EC2, fallback to local .env
    boto3_session = None
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        try:
            boto3_session = boto3.Session(
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_S3_REGION_NAME
            )
            logger.info("Using AWS credentials from local environment to connect to CloudWatch.")
        except Exception as e:
            logger.error(f"Failed to create boto3 Session with local credentials: {e}")
    else:
        try:
            # Let boto3 automatically look up IAM Role (EC2 Instance Profile)
            boto3_session = boto3.Session(region_name=AWS_S3_REGION_NAME)
            logger.info("Using EC2 IAM Instance Profile role to connect to CloudWatch.")
        except Exception as e:
            logger.warning(f"Could not automatically detect IAM Role credentials: {e}")

    if boto3_session:
        try:
            logs_client = boto3_session.client('logs')
            cw_handler = watchtower.CloudWatchLogHandler(
                log_group_name="fav-web-log-group",
                log_stream_name="backend-logs",
                boto3_client=logs_client,
                create_log_group=True,
                send_interval=10 # Ship logs every 10 seconds (batching)
            )
            logger.addHandler(cw_handler)
            logger.info("AWS CloudWatch Logs handler added successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize AWS CloudWatch Logs handler: {e}")
    else:
        logger.warning("AWS CloudWatch Logs handler skipped (no credentials/role). Logs will only output to Console.")
