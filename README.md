# Кампус Пульс

Mobile-first SPA для студентів коледжу на Vue 3, Vite і Tailwind CSS.

## Запуск

```bash
npm install
npm run dev
```

Production-збірка:

```bash
npm run build
```

## Структура

- `src/App.vue` — тестові дані, стан навігації та керування модальним вікном.
- `src/components/CurrentClassWidget.vue` — таймер і реактивний кольоровий прогрес.
- `src/components/ScheduleList.vue` — список пар через `v-for`.
- `src/components/InfoModal.vue` — доступне модальне вікно з фокус-менеджментом.
- `src/components/BottomNavigation.vue` — нижня мобільна навігація.
- `src/components/BellSchedule.vue` — розклад дзвінків і тривалість перерв.
- `src/components/CuratorContact.vue` — швидкий контакт із куратором через телефонний застосунок.
- `src/data/schedule.js` — тижневий розклад та єдине джерело часу пар.
- `src/data/contacts.js` — публічні контактні дані для інтерфейсу.
- `src/style.css` — Tailwind, дизайн-токени, dark theme і safe-area стилі.

Мокові дані в `App.vue` можна замінити відповіддю Python API без зміни інтерфейсів компонентів.

Секрети Telegram зберігаються тільки у локальному `.env.local`, який ігнорується Git. Не додавайте до назв секретних змінних префікс `VITE_`, оскільки такі значення потрапляють у браузерну збірку.
