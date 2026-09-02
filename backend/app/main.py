from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import ErrorReport, Homework, ScheduleEntry
from .schemas import (
    ErrorReportCreate,
    ErrorReportRead,
    HomeworkCreate,
    HomeworkRead,
    ScheduleEntryRead,
    ScheduleEntryUpdate,
)
from .seed import seed_schedule
from .settings import settings
from .telegram import handle_update


VALID_WEEKS = {'odd', 'even'}
VALID_DAYS = {'monday', 'tuesday', 'wednesday', 'thursday', 'friday'}


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_schedule(db)
    yield


app = FastAPI(
    title='Кампус Пульс API',
    description='API розкладу, домашніх завдань і Telegram-бота для групи КН-31.',
    version='1.0.0',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins) or ['*'],
    allow_credentials=False,
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
    allow_headers=['*'],
)


def require_admin(x_admin_key: str = Header(default='')) -> None:
    if not settings.api_admin_key or x_admin_key != settings.api_admin_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Невірний ключ адміністратора')


def validate_week_and_day(week_type: str, day_key: str | None = None) -> None:
    if week_type not in VALID_WEEKS:
        raise HTTPException(status_code=422, detail='Тип тижня має бути odd або even')
    if day_key is not None and day_key not in VALID_DAYS:
        raise HTTPException(status_code=422, detail='Невірний день тижня')


@app.get('/')
def root() -> dict[str, str]:
    return {'status': 'ok', 'message': 'Кампус Пульс API працює'}


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@app.get('/api/schedule/{week_type}', response_model=list[ScheduleEntryRead])
def get_schedule(
    week_type: str,
    day: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    validate_week_and_day(week_type, day)
    query = select(ScheduleEntry).where(ScheduleEntry.week_type == week_type)
    if day:
        query = query.where(ScheduleEntry.day_key == day)
    return db.scalars(query.order_by(ScheduleEntry.day_key, ScheduleEntry.period)).all()


@app.put(
    '/api/schedule/{week_type}/{day_key}/{period}',
    response_model=ScheduleEntryRead,
    dependencies=[Depends(require_admin)],
)
def update_schedule_entry(
    week_type: str,
    day_key: str,
    period: int,
    payload: ScheduleEntryUpdate,
    db: Session = Depends(get_db),
):
    validate_week_and_day(week_type, day_key)
    if period not in range(1, 6):
        raise HTTPException(status_code=422, detail='Номер пари має бути від 1 до 5')
    row = db.scalar(select(ScheduleEntry).where(
        ScheduleEntry.week_type == week_type,
        ScheduleEntry.day_key == day_key,
        ScheduleEntry.period == period,
    ))
    if row is None:
        row = ScheduleEntry(week_type=week_type, day_key=day_key, period=period)
        db.add(row)
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@app.get('/api/homework', response_model=list[HomeworkRead])
def get_homework(db: Session = Depends(get_db)):
    return db.scalars(
        select(Homework).where(Homework.completed.is_(False)).order_by(Homework.due_date, Homework.id)
    ).all()


@app.post('/api/homework', response_model=HomeworkRead, dependencies=[Depends(require_admin)])
def create_homework(payload: HomeworkCreate, db: Session = Depends(get_db)):
    row = Homework(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.post('/api/reports', response_model=ErrorReportRead)
def create_report(payload: ErrorReportCreate, db: Session = Depends(get_db)):
    row = ErrorReport(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.post('/telegram/webhook')
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str = Header(default=''),
    db: Session = Depends(get_db),
):
    if settings.telegram_webhook_secret and x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Невірний секрет webhook')
    await handle_update(await request.json(), db)
    return {'ok': True}
