from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ScheduleEntry


BASE_SCHEDULE = {
    'monday': [('Екологія', '411'), ('Математика', '407'), ('Українська література', '410'), (None, None)],
    'tuesday': [('Основи правознавства', '301'), ('Захист України', '305л'), ('Основи економічної теорії / Фізкультура', '418 / кфв'), ('Зарубіжна література / Історія України', '214 / 408')],
    'wednesday': [('Іноземна мова', '302 / 313л'), ('Всесвітня історія / Хімія', '401 / 406'), ('Українська мова', '410'), ('Біологія', '405')],
    'thursday': [('Фізика і астрономія', '413'), ('Інформатика', '320'), ('Фізична культура', 'кфв'), ('Математика', '406')],
    'friday': [('Фізика і астрономія', '413'), ('Основи економічної теорії', '418'), ('Інформатика', '320'), (None, None)],
}


def seed_schedule(db: Session) -> None:
    if db.scalar(select(ScheduleEntry.id).limit(1)) is not None:
        return

    for week_type in ('odd', 'even'):
        for day_key, lessons in BASE_SCHEDULE.items():
            for period, (subject, room) in enumerate(lessons, start=1):
                db.add(ScheduleEntry(
                    week_type=week_type,
                    day_key=day_key,
                    period=period,
                    subject=subject,
                    room=room,
                    teacher=None if subject else 'Пари немає',
                    dossier='Дані можна доповнити через Telegram-бота.' if subject else 'Цей час вільний від занять.',
                ))
    db.commit()
