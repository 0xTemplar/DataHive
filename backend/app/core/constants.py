from dotenv import load_dotenv
import os

load_dotenv()


SQLALCHEMY_DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URL")
BASE_URL = os.getenv("BASE_URL")
API_KEY= os.getenv("API_KEY")
REDIS_URL = os.getenv("REDIS_URL")
LILYPAD_API_KEY = os.getenv("LILYPAD_API_KEY")
AKAVE_PRIVATE_KEY = os.getenv("AKAVE_PRIVATE_KEY")
