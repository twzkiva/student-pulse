from datetime import UTC, date, datetime

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class ScheduleEntry(Base):
    __tablename__ = 'schedule_entries'
    __table_args__ = (UniqueConstraint('week_type', 'day_key', 'period'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    week_type: Mapped[str] = mapped_column(String(8), index=True)
    day_key: Mapped[str] = mapped_column(String(12), index=True)
    period: Mapped[int] = mapped_column(Integer)
    subject: Mapped[str | None] = mapped_column(String(160), nullable=True)
    room: Mapped[str | None] = mapped_column(String(40), nullable=True)
    teacher: Mapped[str | None] = mapped_column(String(120), nullable=True)
    dossier: Mapped[str | None] = mapped_column(Text, nullable=True)
    route: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)


class Homework(Base):
    __tablename__ = 'homework'

    id: Mapped[int] = mapped_column(primary_key=True)
    subject: Mapped[str] = mapped_column(String(160))
    text: Mapped[str] = mapped_column(Text)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class ErrorReport(Base):
    __tablename__ = 'error_reports'

    id: Mapped[int] = mapped_column(primary_key=True)
    text: Mapped[str] = mapped_column(Text)
    reporter_chat_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
