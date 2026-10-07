# MAX Чат (GREEN-API) — тестовое задание, React

Простой веб-интерфейс для отправки и получения текстовых сообщений в мессенджере MAX через [GREEN-API](https://green-api.com/max).
Внешний вид чата — по прототипу https://web.max.ru/ (список чатов слева, диалог справа).

## Что умеет

1. Вход по `idInstance` и `apiTokenInstance` (проверяется методом `getStateInstance`).
2. Создание чата по номеру телефона: номер превращается в `chatId` методом `checkAccount`.
3. Отправка текстового сообщения методом [`SendMessage`](https://green-api.com/v3/docs/api/sending/SendMessage/).
4. Получение ответов через [HTTP API](https://green-api.com/v3/docs/api/receiving/technology-http-api/): `receiveNotification` (long polling, 5 с), затем `deleteNotification`.
5. Входящее сообщение от нового собеседника автоматически создаёт чат в списке.

Только текстовые сообщения. Чаты и учётные данные хранятся в `localStorage` браузера.

## Локальный запуск

Нужен Node.js 18+.

```bash
git clone <ссылка-на-репозиторий>
cd max-chat
npm install
npm run dev
```

Откройте http://localhost:5173, введите `idInstance` и `apiTokenInstance` из личного кабинета GREEN-API.

Сборка для публикации: `npm run build` (папка `dist`, можно выложить на GitHub Pages, Netlify или Vercel).

## Как проверить

1. В личном кабинете GREEN-API создайте инстанс MAX и авторизуйте его.
2. Войдите в приложение, введите номер получателя (например `79991234567`) и нажмите «Новый чат».
3. Отправьте сообщение, получатель увидит его в MAX.
4. Ответьте с телефона получателя, ответ появится в чате в течение нескольких секунд.

## Заметки

- Адрес API определяется по первым четырём цифрам `idInstance` (например `https://3100.api.green-api.com`). При необходимости его можно ввести вручную в поле «Адрес API».
- Если вы тестируете другим мессенджером (WhatsApp/Telegram), укажите его `apiUrl` вручную.
- Если приложение не принимает входящие, проверьте в личном кабинете, что включены уведомления о входящих сообщениях.

## Структура

- `src/api.js` — клиент GREEN-API
- `src/store.js` — состояние чатов (reducer + localStorage)
- `src/Login.jsx` — экран входа
- `src/App.jsx` — список чатов, диалог, polling
- `src/styles.css` — стили
