@AGENTS.md

# Connectus Frontend

Connectus — маркетплейс менторов для поступления за рубеж (США, UK, Германия и др.).
Студенты находят менторов, покупают консультации и помощь с документами.

## Стек

- Next.js 15, TypeScript, Tailwind CSS
- App Router (папка `app/`)
- Данные сейчас из моков (`lib/mocks.ts`), потом будет реальный API

## Структура проекта

```
app/
  page.tsx                        — главная (список менторов) — ГОТОВО
  layout.tsx                      — шапка, навигация — ГОТОВО
  mentors/[id]/page.tsx           — профиль ментора — ГОТОВО
  auth/login/page.tsx             — вход — ГОТОВО (нужно подключить к API)
  auth/register/page.tsx          — регистрация — ГОТОВО (нужно подключить к API)
  student/dashboard/page.tsx      — личный кабинет студента — НУЖНО СДЕЛАТЬ
  mentor/dashboard/page.tsx       — личный кабинет ментора — НУЖНО СДЕЛАТЬ
  orders/[id]/page.tsx            — страница заказа — НУЖНО СДЕЛАТЬ

lib/
  mocks.ts    — тестовые данные (3 ментора)
  api.ts      — функции для запросов к бэкенду (сейчас USE_MOCKS = true)

types/
  index.ts    — все TypeScript типы
```

## Типы данных (types/index.ts)

```typescript
Mentor          — профиль ментора (имя, страна, университет, специализации, услуги)
MentorService   — услуга ментора (консультация, проверка документов, и т.д.)
StudentProfile  — профиль студента
Order           — заказ (связь студента и услуги ментора)
User            — авторизованный пользователь (id, email, role: "mentor" | "student")
ChatMessage     — одно сообщение в чате (sender_id, sender_role, content, created_at)
ChatInquiry     — чат до оплаты (messages + messages_remaining — макс 5)
```

## Как работают моки

Сейчас `lib/api.ts` возвращает данные из `lib/mocks.ts` (не обращается к серверу).
Переключатель: `USE_MOCKS = true` в начале `lib/api.ts`.

Когда бэкенд будет готов — Жанар скажет, и меняем на `USE_MOCKS = false`.

## Готовые функции в api.ts

- `fetchMentors()` — список всех менторов
- `fetchMentor(id)` — один ментор по id
- `login(email, password)` — вход
- `register(email, password, role)` — регистрация

## Что нужно сделать (приоритет)

### 1. Личный кабинет студента (`app/student/dashboard/page.tsx`)
- Показать имя и профиль студента
- Список его заказов с статусом (draft, paid, in_progress, completed)
- Кнопка "Найти ментора" → ведёт на главную

### 2. Личный кабинет ментора (`app/mentor/dashboard/page.tsx`)
- Показать профиль ментора
- Список входящих заказов
- Список его услуг с ценами

### 3. Страница заказа (`app/orders/[id]/page.tsx`)
- Детали заказа (услуга, цена, статус оплаты)
- Статус заказа (draft / paid / in_progress / completed / disputed)
- Чат между студентом и ментором (только после оплаты)

### 4. Чат до оплаты на странице ментора (`app/mentors/[id]/page.tsx`)
- Кнопка "Задать вопрос" → открывает мини-чат
- Показывает сколько сообщений осталось (`messages_remaining` из `ChatInquiry`)
- Когда лимит исчерпан → показать "Оплати заказ чтобы продолжить общение"

## Правила написания кода

- Используй TypeScript типы из `types/index.ts` — не создавай новые
- Стили только через Tailwind CSS классы — не пиши inline styles и не создавай CSS файлы
- Для данных вызывай функции из `lib/api.ts` — не fetch напрямую
- Серверные компоненты по умолчанию, `"use client"` только если нужен useState/useEffect
- Не меняй `lib/mocks.ts`, `lib/api.ts`, `types/index.ts` без команды от Жанар

## Связь с бэкендом

Бэкенд пишет Жанар отдельно. Когда эндпоинт готов — она обновит `lib/api.ts`
и скажет переключить `USE_MOCKS = false`.

Бэкенд работает на `http://localhost:8000/api/v1` (локально).
