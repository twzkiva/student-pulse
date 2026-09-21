import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[2] / '.env.local')
load_dotenv(Path(__file__).resolve().parents[1] / '.env.local')


def _split_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(',') if origin.strip()]


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv('DATABASE_URL', 'sqlite:///./campus_pulse.db')
    api_admin_key: str = os.getenv('API_ADMIN_KEY', '')
    telegram_bot_token: str = os.getenv('TELEGRAM_BOT_TOKEN', '')
    telegram_admin_chat_id: int = int(os.getenv('TELEGRAM_ADMIN_CHAT_ID', '0') or 0)
    telegram_admin_user_ids: tuple[int, ...] = tuple(
        int(value.strip()) for value in os.getenv('TELEGRAM_ADMIN_USER_IDS', '').split(',')
        if value.strip().isdigit() and int(value.strip()) > 0
    )
    telegram_webhook_secret: str = os.getenv('TELEGRAM_WEBHOOK_SECRET', '')
    allowed_origins: tuple[str, ...] = tuple(
        _split_origins(os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173'))
    )


settings = Settings()
