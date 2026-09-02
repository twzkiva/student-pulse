import os
import tempfile
import unittest
from pathlib import Path


_temporary_directory = tempfile.TemporaryDirectory()
_database_path = Path(_temporary_directory.name, 'test.db').as_posix()
os.environ['DATABASE_URL'] = f'sqlite:///{_database_path}'

from fastapi.testclient import TestClient  # noqa: E402

from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402


def tearDownModule():
    engine.dispose()
    _temporary_directory.cleanup()


class ApiSmokeTest(unittest.TestCase):
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


if __name__ == '__main__':
    unittest.main()
