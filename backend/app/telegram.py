from datetime import date, datetime
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ErrorReport, Homework, ScheduleEntry
from .settings import settings


DAY_NAMES = {
    'monday': 'Понеділок',
    'tuesday': 'Вівторок',
    'wednesday': 'Середа',
    'thursday': 'Четвер',
    'friday': 'П’ятниця',
}
DAY_ALIASES = {
    'пн': 'monday', 'понеділок': 'monday', 'monday': 'monday',
    'вт': 'tuesday', 'вівторок': 'tuesday', 'tuesday': 'tuesday',
    'ср': 'wednesday', 'середа': 'wednesday', 'wednesday': 'wednesday',
    'чт': 'thursday', 'четвер': 'thursday', 'thursday': 'thursday',
    'пт': 'friday', 'п’ятниця': 'friday', "п'ятниця": 'friday', 'friday': 'friday',
}
WEEK_ALIASES = {
    'odd': 'odd', 'непарний': 'odd', 'непарна': 'odd',
    'even': 'even', 'парний': 'even', 'парна': 'even',
}
BELL_TIMES = {
    1: '08:30–09:50', 2: '10:00–11:20', 3: '12:00–13:20',
    4: '13:30–14:50', 5: '15:00–16:20',
}


def current_week_type(today: date) -> str:
    return 'even' if today.isocalendar().week % 2 == 0 else 'odd'


def is_admin(message: dict) -> bool:
    allowed = settings.telegram_admin_user_ids or (settings.telegram_admin_chat_id,)
    sender = message.get('from')
    sender_id = sender.get('id') if isinstance(sender, dict) else None
    return type(sender_id) is int and sender_id > 0 and sender_id in allowed


async def send_message(chat_id: int, text: str) -> None:
    if not settings.telegram_bot_token:
        return
    url = f'https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage'
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(url, json={'chat_id': chat_id, 'text': text})
        if response.status_code != 200 or not response.json().get('ok'):
            raise RuntimeError(f'Telegram API: {response.status_code}')


def schedule_text(db: Session, day_key: str, week_type: str) -> str:
    rows = db.scalars(
        select(ScheduleEntry)
        .where(ScheduleEntry.week_type == week_type, ScheduleEntry.day_key == day_key)
        .order_by(ScheduleEntry.period)
    ).all()
    type_label = 'парний' if week_type == 'even' else 'непарний'
    lines = [f'{DAY_NAMES.get(day_key, day_key)} · {type_label} тиждень']
    for row in rows:
        lesson = row.subject or 'Вікно'
        room = f' · ауд. {row.room}' if row.room else ''
        lines.append(f'{row.period}. {BELL_TIMES.get(row.period, "")} · {lesson}{room}')
    return '\n'.join(lines)


HELP_TEXT = (
    'Я оновлюю «Кампус Пульс».\n\n'
    '/today — розклад на сьогодні\n'
    '/week — розклад на поточний тиждень\n'
    '/report текст — повідомити про помилку\n\n'
    'Команди куратора:\n'
    '/setlesson непарний пн 1 Предмет | 405\n'
    '/cancel парний пт 4\n'
    '/homework Предмет | Завдання | 2026-09-10\n'
    '/homework — список завдань з номерами\n'
    '/done 12 — завершити завдання (куратор)'
)


async def handle_update(update: dict, db: Session) -> None:
    message = update.get('message')
    if not isinstance(message, dict) or not isinstance(message.get('text'), str) or not message['text'].strip():
        return
    if not isinstance(message.get('chat'), dict) or type(message['chat'].get('id')) is not int:
        return

    chat_id = int(message['chat']['id'])
    text = message['text'].strip()
    command = text.split(maxsplit=1)[0].split('@')[0].lower()

    if command in ('/start', '/help'):
        start_parameter = text.split(maxsplit=1)[1] if ' ' in text else ''
        prefix = 'Опиши помилку командою /report текст.\n\n' if start_parameter == 'report' else ''
        await send_message(chat_id, prefix + HELP_TEXT)
        return

    today = date.today()
    try:
        today = datetime.now(ZoneInfo('Europe/Kyiv')).date()
    except (KeyError, ValueError):
        pass
    week_type = current_week_type(today)
    day_key = ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')[today.weekday()]

    if command == '/today':
        if day_key not in DAY_NAMES:
            await send_message(chat_id, 'Сьогодні вихідний — навчальних пар немає.')
        else:
            await send_message(chat_id, schedule_text(db, day_key, week_type))
        return

    if command == '/week':
        parts = [schedule_text(db, key, week_type) for key in DAY_NAMES]
        await send_message(chat_id, '\n\n'.join(parts))
        return

    if command == '/report':
        report_text = text.partition(' ')[2].strip()
        if not report_text:
            await send_message(chat_id, 'Напиши так: /report що саме не так у розкладі')
            return
        if len(report_text) > 2000:
            await send_message(chat_id, 'Скороти повідомлення до 2000 символів.')
            return
        db.add(ErrorReport(text=report_text, reporter_chat_id=str(chat_id)))
        db.commit()
        await send_message(chat_id, 'Дякую! Повідомлення збережено й передано куратору.')
        if settings.telegram_admin_chat_id and settings.telegram_admin_chat_id != chat_id:
            await send_message(settings.telegram_admin_chat_id, f'Нове повідомлення про помилку:\n{report_text}')
        return

    if command == '/homework' and len(text.split()) == 1:
        rows = db.scalars(select(Homework).where(Homework.completed.is_(False)).order_by(Homework.due_date, Homework.id)).all()
        lines = [f'#{row.id} · {row.subject} · {row.due_date or "без дати"}\n{row.text}' for row in rows]
        await send_message(chat_id, '\n\n'.join(lines)[:4000] if lines else 'Активних завдань немає.')
        return

    if not is_admin(message):
        await send_message(chat_id, 'Ця команда доступна лише куратору. Скористайся /today, /week або /report.')
        return

    if command == '/setlesson':
        tokens = text.split(maxsplit=4)
        if len(tokens) != 5:
            await send_message(chat_id, 'Формат: /setlesson непарний пн 1 Предмет | 405')
            return
        _, header, day_token, period_token, subject_room = tokens
        subject, separator4, room = subject_room.partition('|')
        parsed_week = WEEK_ALIASES.get(header.lower())
        parsed_day = DAY_ALIASES.get(day_token.lower())
        if not all((separator4, parsed_week, parsed_day, period_token in ('1', '2', '3', '4', '5'), subject.strip(), room.strip())) or len(subject.strip()) > 160 or len(room.strip()) > 40:
            await send_message(chat_id, 'Формат: /setlesson непарний пн 1 Предмет | 405')
            return
        period = int(period_token)
        if period not in BELL_TIMES:
            await send_message(chat_id, 'Номер пари має бути від 1 до 5.')
            return
        row = db.scalar(select(ScheduleEntry).where(
            ScheduleEntry.week_type == parsed_week,
            ScheduleEntry.day_key == parsed_day,
            ScheduleEntry.period == period,
        ))
        if row is None:
            row = ScheduleEntry(week_type=parsed_week, day_key=parsed_day, period=period)
            db.add(row)
        if row.subject != subject.strip():
            row.teacher = None
            row.dossier = None
        if row.room != room.strip():
            row.route = None
        row.subject, row.room = subject.strip(), room.strip()
        db.commit()
        await send_message(chat_id, f'Оновлено:\n{schedule_text(db, parsed_day, parsed_week)}')
        return

    if command == '/cancel':
        parts = text.split()
        parsed_week = WEEK_ALIASES.get(parts[1].lower()) if len(parts) > 1 else None
        parsed_day = DAY_ALIASES.get(parts[2].lower()) if len(parts) > 2 else None
        if len(parts) != 4 or not parsed_week or not parsed_day or parts[3] not in ('1', '2', '3', '4', '5'):
            await send_message(chat_id, 'Формат: /cancel парний пт 4')
            return
        period = int(parts[3])
        if period not in BELL_TIMES:
            await send_message(chat_id, 'Номер пари має бути від 1 до 5.')
            return
        row = db.scalar(select(ScheduleEntry).where(
            ScheduleEntry.week_type == parsed_week,
            ScheduleEntry.day_key == parsed_day,
            ScheduleEntry.period == period,
        ))
        if row is None:
            row = ScheduleEntry(week_type=parsed_week, day_key=parsed_day, period=period)
            db.add(row)
        row.subject = row.room = row.teacher = row.dossier = row.route = None
        db.commit()
        await send_message(chat_id, 'Пару скасовано. Застосунок отримає зміни під час синхронізації.')
        return

    if command == '/homework':
        payload = text.partition(' ')[2]
        parts = [part.strip() for part in payload.split('|')]
        if len(parts) != 3 or not all(parts) or len(parts[0]) > 160 or len(parts[1]) > 2000:
            await send_message(chat_id, 'Формат: /homework Предмет | Завдання | 2026-09-10')
            return
        try:
            due_date = date.fromisoformat(parts[2])
            if due_date.isoformat() != parts[2]:
                raise ValueError('Non-canonical date')
        except ValueError:
            await send_message(chat_id, 'Дата має бути у форматі РРРР-ММ-ДД, наприклад 2026-09-10.')
            return
        db.add(Homework(subject=parts[0], text=parts[1], due_date=due_date))
        db.commit()
        await send_message(chat_id, 'Домашнє завдання додано.')
        return

    if command == '/done':
        parts = text.split()
        if len(parts) != 2 or not parts[1].isascii() or not parts[1].isdigit() or len(parts[1]) > 16 or int(parts[1]) > 9007199254740991:
            await send_message(chat_id, 'Формат: /done 12. Номер завдання можна знайти командою /homework.')
            return
        row = db.get(Homework, int(parts[1]))
        if row is None or row.completed:
            await send_message(chat_id, 'Активне завдання з таким номером не знайдено.')
            return
        row.completed = True
        db.commit()
        await send_message(chat_id, 'Завдання завершено.')
        return

    await send_message(chat_id, HELP_TEXT)
