import os
import tempfile
import unittest
from pathlib import Path
from dataclasses import replace
from unittest.mock import AsyncMock, patch


_temporary_directory = tempfile.TemporaryDirectory()
_database_path = Path(_temporary_directory.name, 'test.db').as_posix()
os.environ['DATABASE_URL'] = f'sqlite:///{_database_path}'
os.environ['API_ADMIN_KEY'] = 'test-admin-key'
os.environ['TELEGRAM_BOT_TOKEN'] = 'fake-token'
os.environ['TELEGRAM_ADMIN_CHAT_ID'] = '123'
os.environ['TELEGRAM_ADMIN_USER_IDS'] = ''
os.environ['TELEGRAM_WEBHOOK_SECRET'] = 'test-secret'

from fastapi.testclient import TestClient  # noqa: E402

from app.database import engine, Base  # noqa: E402
from app.main import app  # noqa: E402
from app.settings import settings  # noqa: E402


def tearDownModule():
    engine.dispose()
    _temporary_directory.cleanup()


class ApiSmokeTest(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(bind=engine)
        self.client = self.enterContext(TestClient(app, raise_server_exceptions=False))
        self.send = self.enterContext(patch('app.telegram.send_message', new_callable=AsyncMock))
        self.update_id = 100

    def hook(self, text, sender=123, chat=None, secret='test-secret', update_id=None):
        self.update_id += 1
        return self.client.post('/telegram/webhook',
            headers={'x-telegram-bot-api-secret-token': secret},
            json={'update_id': update_id if update_id is not None else self.update_id,
                  'message': {'text': text, 'from': {'id': sender}, 'chat': {'id': sender if chat is None else chat}}})

    def test_health_and_seeded_data(self):
        with TestClient(app) as client:
            health = client.get('/health')
            schedule = client.get('/api/schedule/odd', params={'day': 'monday'})
            homework = client.get('/api/homework')

        self.assertEqual(health.status_code, 200)
        self.assertEqual(len(schedule.json()), 4)
        self.assertEqual(schedule.json()[0]['subject'], 'Екологія')
        self.assertEqual(homework.status_code, 200)

    def test_admin_endpoint_is_protected(self):
        with TestClient(app) as client:
            response = client.put(
                '/api/schedule/odd/monday/1',
                json={'subject': 'Тест', 'room': '101'},
            )
        self.assertEqual(response.status_code, 401)

    def test_webhook_requires_configuration_and_secret(self):
        self.assertEqual(self.hook('/cancel odd monday 1', secret='wrong').status_code, 403)
        with patch('app.main.settings', replace(settings, telegram_webhook_secret='')):
            self.assertEqual(self.hook('/cancel odd monday 1').status_code, 503)
        self.send.assert_not_awaited()

    def test_admin_chat_does_not_grant_admin_to_other_senders(self):
        self.assertEqual(self.hook('/cancel odd monday 1', sender=999, chat=123).status_code, 200)
        rows = self.client.get('/api/schedule/odd?day=monday').json()
        self.assertEqual(rows[0]['subject'], 'Екологія')

    def test_sparse_update_preserves_fields_and_replacement_clears_metadata(self):
        headers = {'x-admin-key': 'test-admin-key'}
        before = self.client.get('/api/schedule/odd?day=monday').json()[0]
        after = self.client.put('/api/schedule/odd/monday/1', headers=headers, json={'room': '123'}).json()
        self.assertEqual(after['subject'], before['subject'])
        self.assertEqual(after['teacher'], before['teacher'])
        self.assertIsNone(after['route'])
        self.assertEqual(self.hook('/setlesson odd monday 4 Новий предмет | 123').status_code, 200)
        row = self.client.get('/api/schedule/odd?day=monday').json()[3]
        self.assertEqual(row['subject'], 'Новий предмет')
        for key in ('teacher', 'dossier', 'route'):
            self.assertIsNone(row[key])

    def test_invalid_dates_periods_and_huge_numbers_are_rejected(self):
        for day in ('2026-99-99', '2026-02-29', '2026-04-31'):
            self.assertEqual(self.hook(f'/homework Math | Task | {day}').status_code, 200)
        for command in ('/cancel odd monday 6', '/cancel odd monday ' + '9' * 5000, '/done ' + '9' * 5000, '/done ²'):
            self.assertEqual(self.hook(command).status_code, 200)
        self.assertEqual(self.client.get('/api/homework').json(), [])
        self.assertEqual(len(self.client.get('/api/schedule/odd?day=monday').json()), 4)

    def test_retry_after_notification_failure_does_not_duplicate_homework(self):
        self.send.side_effect = RuntimeError('simulated Telegram outage')
        self.assertEqual(self.hook('/homework Math | Task | 2026-09-10', update_id=555).status_code, 500)
        self.send.side_effect = None
        self.assertEqual(self.hook('/homework Math | Task | 2026-09-10', update_id=555).status_code, 200)
        self.assertEqual(len(self.client.get('/api/homework').json()), 1)

    def test_only_admin_can_complete_homework(self):
        self.hook('/homework Math | Task | 2026-09-10')
        task_id = self.client.get('/api/homework').json()[0]['id']
        self.hook('/homework', sender=999)
        self.assertIn(f'#{task_id}', self.send.await_args.args[1])
        self.hook(f'/done {task_id}', sender=999)
        self.assertEqual(len(self.client.get('/api/homework').json()), 1)
        self.hook(f'/done {task_id}')
        self.assertEqual(self.client.get('/api/homework').json(), [])

    def test_malformed_requests_are_controlled(self):
        headers = {'x-telegram-bot-api-secret-token': 'test-secret'}
        for body in ('oops', 'null', '[]'):
            self.assertEqual(self.client.post('/telegram/webhook', headers=headers, content=body).status_code, 400)
        self.assertEqual(self.client.post('/telegram/webhook', headers=headers, content='x' * 65537).status_code, 413)
        for update_id in (True, -1, '1', 9007199254740992):
            self.assertEqual(self.hook('/week', update_id=update_id).status_code, 422)
        self.assertEqual(self.client.post('/telegram/webhook', headers=headers, json={
            'update_id': 800, 'message': {'text': '/cancel odd monday 1', 'chat': {'id': 123}, 'from': []}
        }).status_code, 200)

    def test_whitespace_only_payloads_are_rejected(self):
        self.assertEqual(self.client.post('/api/reports', json={'text': '   '}).status_code, 422)
        self.assertEqual(self.client.post('/api/homework', headers={'x-admin-key': 'test-admin-key'},
            json={'subject': '  ', 'text': 'Task'}).status_code, 422)


if __name__ == '__main__':
    unittest.main()
