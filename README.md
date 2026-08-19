# NovaChat Frontend — rebuilt for the supplied backend

This version is written against the actual API found in the supplied `chatgpt-backend.zip`.

## Backend endpoints used

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/user/get-me`
- `GET /api/chat/getRecentChat`
- `GET /api/chat/:chatId`
- `DELETE /api/chat/:chatId`
- `GET /api/message/:chatId`
- `POST /api/message/`
- `POST /api/message/:chatId`

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

The supplied backend's config defaults to port 3000, so the example uses:

```env
VITE_API_URL=http://localhost:3000/api
```

If you changed `PORT` in the backend `.env`, change the frontend URL too.

## CORS

Your Express backend must allow `http://localhost:5173` and credentials. Install:

```bash
npm install cors
```

Then before the routes in `server.js`:

```js
import cors from "cors";

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  exposedHeaders: ["Authorization"]
}));
```

## Important refresh-token detail

Your current refresh controller returns:

```js
res.header("Authorization", newaccessToken);
```

The frontend deliberately accepts both raw tokens and `Bearer <token>` from this endpoint, so it works with your current backend. For consistency, change it to:

```js
res.header("Authorization", `Bearer ${newaccessToken}`);
```

## Important backend bugs

The frontend does not call `/api/chat/createChat`, because your message endpoint creates a chat automatically when there is no `chatId`. This avoids the current `createChat._id` bug.

There is another bug in `sendMessage`:

```js
if (chat.topic.toLowerCase() === "new chat")
```

Use:

```js
if ((chat.topic || "new chat").toLowerCase() === "new chat") {
  chat.topic = content.trim().slice(0, 40);
}
```

Also make sure the backend actually saves the updated chat after changing `topic`/`messageCount`; add:

```js
await chat.save();
```

before the response.

## Streaming

The supplied backend currently waits for the complete OpenRouter result and returns it in one response. This frontend therefore progressively reveals the returned answer and auto-scrolls while it is revealed.

That is intentionally different from fake network streaming: the UI is ready for incremental updates, but genuine token streaming requires the backend/OpenRouter service to stream data.

## No-cache / Postman-style requests

The frontend does not use cached API responses. Every request uses `fetch(..., { cache: "no-store" })`, sends `Cache-Control: no-cache, no-store`, and GET/HEAD requests receive a unique cache-busting query parameter. This prevents browser/HTTP cache reuse and makes the frontend fetch fresh data like a Postman request.
