from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ScheduleEntryBase(BaseModel):
    subject: str | None = Field(default=None, max_length=160)
    room: str | None = Field(default=None, max_length=40)
    teacher: str | None = Field(default=None, max_length=120)
    dossier: str | None = None
    route: str | None = None


class ScheduleEntryUpdate(ScheduleEntryBase):
    pass


class ScheduleEntryRead(ScheduleEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    week_type: str
    day_key: str
    period: int
    updated_at: datetime


class HomeworkCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=160)
    text: str = Field(min_length=1, max_length=2000)
    due_date: date | None = None


class HomeworkRead(HomeworkCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    completed: bool
    created_at: datetime


class ErrorReportCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    reporter_chat_id: str | None = None


class ErrorReportRead(ErrorReportCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
