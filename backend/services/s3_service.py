import os
import logging
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Set up logging
logger = logging.getLogger("s3_service")
logging.basicConfig(level=logging.INFO)

# Load environment variables
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=BASE_DIR / ".env")

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "ap-southeast-2")

EMBED_DIR = BASE_DIR / 'data' / 'embeddings'
EMBED_DIR.mkdir(parents=True, exist_ok=True)

# Initialize S3 client
s3_client = None
if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_S3_REGION_NAME
        )
        logger.info("S3 Client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize S3 client: {e}")
else:
    logger.warning("AWS credentials not fully configured in .env. S3 upload will be disabled.")


def upload_file_to_s3(file_bytes: bytes, s3_key: str, content_type: str = "image/png") -> str:
    """
    Uploads raw file bytes to S3 and returns the public S3 URL.
    """
    if not s3_client or not AWS_STORAGE_BUCKET_NAME:
        logger.error("S3 Client not configured. Cannot upload.")
        raise RuntimeError("S3 client not initialized. Check credentials in .env")

    try:
        s3_client.put_object(
            Bucket=AWS_STORAGE_BUCKET_NAME,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type
        )
        # Construct the standard S3 URL
        url = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
        logger.info(f"Successfully uploaded {s3_key} to S3. URL: {url}")
        return url
    except ClientError as e:
        logger.error(f"Failed to upload {s3_key} to S3: {e}")
        raise e


def upload_embedding(user_id: str, local_path: Path) -> bool:
    """
    Uploads a local .npy embedding file to S3 under embeddings/{user_id}.npy
    """
    if not s3_client or not AWS_STORAGE_BUCKET_NAME:
        return False

    s3_key = f"embeddings/{user_id}.npy"
    try:
        if local_path.exists():
            with open(local_path, "rb") as f:
                s3_client.put_object(
                    Bucket=AWS_STORAGE_BUCKET_NAME,
                    Key=s3_key,
                    Body=f.read(),
                    ContentType="application/octet-stream"
                )
            logger.info(f"Successfully uploaded embedding for {user_id} to S3.")
            return True
        else:
            logger.warning(f"Local embedding file not found: {local_path}")
            return False
    except ClientError as e:
        logger.error(f"Failed to upload embedding for {user_id} to S3: {e}")
        return False


def download_all_embeddings():
    """
    Downloads all embedding (.npy) files from S3 to the local embeddings folder.
    This ensures that on startup, the container has all embeddings locally for fast matching.
    """
    if not s3_client or not AWS_STORAGE_BUCKET_NAME:
        logger.warning("S3 client not initialized. Skipping embedding download.")
        return

    logger.info("Syncing embeddings from AWS S3...")
    try:
        response = s3_client.list_objects_v2(
            Bucket=AWS_STORAGE_BUCKET_NAME,
            Prefix="embeddings/"
        )
        
        if 'Contents' not in response:
            logger.info("No embeddings found in S3 bucket.")
            return

        download_count = 0
        for obj in response['Contents']:
            key = obj['Key']
            if not key.endswith('.npy'):
                continue
            
            filename = Path(key).name
            local_path = EMBED_DIR / filename
            
            # Download file
            logger.info(f"Downloading {filename} from S3...")
            s3_client.download_file(
                Bucket=AWS_STORAGE_BUCKET_NAME,
                Key=key,
                Filename=str(local_path)
            )
            download_count += 1
            
        logger.info(f"Successfully synced {download_count} embeddings from S3.")
    except ClientError as e:
        logger.error(f"Error syncing embeddings from S3: {e}")
    except Exception as e:
        logger.error(f"Unexpected error syncing embeddings: {e}")


def sync_local_embeddings_to_s3():
    """
    Scans the local embeddings directory and uploads all .npy files to S3.
    This ensures S3 is always in sync with any training done offline.
    """
    if not s3_client or not AWS_STORAGE_BUCKET_NAME:
        logger.warning("S3 client not initialized. Skipping local embedding sync to S3.")
        return False

    logger.info("Scanning local embeddings for S3 synchronization...")
    try:
        if not EMBED_DIR.exists():
            logger.info("Local embeddings directory does not exist. Skipping.")
            return False

        uploaded_count = 0
        for local_path in EMBED_DIR.glob('*.npy'):
            user_id = local_path.stem
            success = upload_embedding(user_id, local_path)
            if success:
                uploaded_count += 1
                
        logger.info(f"Successfully synced {uploaded_count} embeddings to S3.")
        return True
    except Exception as e:
        logger.error(f"Unexpected error syncing local embeddings to S3: {e}")
        return False

