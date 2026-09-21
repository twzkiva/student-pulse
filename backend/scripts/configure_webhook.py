import argparse
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[2] / '.env.local')
    load_dotenv(Path(__file__).resolve().parents[1] / '.env.local')
    parser = argparse.ArgumentParser(description='Підключити Telegram webhook до опублікованого API.')
    parser.add_argument('base_url', help='HTTPS-адреса API, наприклад https://example.onrender.com')
    args = parser.parse_args()

    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    secret = os.environ.get('TELEGRAM_WEBHOOK_SECRET', '')
    if not token or not secret:
        raise SystemExit('Потрібні TELEGRAM_BOT_TOKEN і TELEGRAM_WEBHOOK_SECRET у середовищі.')

    response = httpx.post(
        f'https://api.telegram.org/bot{token}/setWebhook',
        data={
            'url': f'{args.base_url.rstrip("/")}/telegram/webhook',
            'secret_token': secret,
            'drop_pending_updates': 'true',
        },
        timeout=15,
    )
    response.raise_for_status()
    result = response.json()
    print(result.get('description', 'Webhook налаштовано.'))


if __name__ == '__main__':
    main()
