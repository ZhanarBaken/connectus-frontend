# Connectus — Frontend

Next.js фронтенд для платформы менторства. Студенты находят менторов и записываются на консультации, менторы управляют профилем и услугами.

## После клонирования

```bash
sh scripts/install-hooks.sh
```

Активирует git-хук: прямой `git push origin main` будет заблокирован. Пуш только в `staging`, потом PR в `main`.

---

**Бэкенд**: `connectus` → `http://localhost:8000/api/v1/`

---

## Запуск

```bash
npm install
npm run dev
```

Открой `http://localhost:3000`.

> Бэкенд должен быть запущен на `http://localhost:8000`. Смотри README в `connectus`.

---

## Страницы

| URL | Описание | Доступ |
|-----|----------|--------|
| `/` | Список менторов | Публично |
| `/mentors/[id]` | Профиль ментора + запись на консультацию | Только авторизованные |
| `/auth/login` | Вход | — |
| `/auth/register` | Регистрация (студент / ментор) | — |
| `/student/dashboard` | Кабинет студента | student |
| `/orders` | Мои заказы | student / mentor |
| `/profile` | Профиль студента | student |
| `/mentor/dashboard` | Кабинет ментора | mentor |
| `/mentors/profile` | Редактировать профиль ментора | mentor |
| `/mentors/services` | Управление услугами | mentor |

---

## Структура проекта

```
app/                        — страницы (Next.js App Router)
components/
  Header.tsx                — шапка с навигацией по роли
lib/
  api.ts                    — все запросы к бэкенду
  mocks.ts                  — тестовые данные (не используются, USE_MOCKS=false)
types/
  index.ts                  — TypeScript типы
```

---

## Авторизация

JWT токены хранятся в `localStorage`:
- `access_token` — для запросов к API
- `refresh_token`
- `role` — `mentor` или `student`

После логина редирект на кабинет по роли. Поддерживается `?next=` параметр (например `/auth/login?next=/mentors/5`).

---

## Переменные окружения

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

По умолчанию используется `http://localhost:8000/api/v1` если переменная не задана.
