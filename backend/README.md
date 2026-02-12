# Servify Chatbot API (Node.js)

Same API as the Python backend: **GET /v1/status**, **POST /v1/chat**. Use this to run and test the API in Node.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # set OPENAI_API_KEY
```

## Run

```bash
npm start
# or with auto-reload:
npm run dev
```

Server runs at **http://127.0.0.1:8000** (or `PORT` from `.env`).

## Test

- Health: `curl http://127.0.0.1:8000/v1/status`
- Chat: `curl -X POST http://127.0.0.1:8000/v1/chat -H "Content-Type: application/json" -d "{\"message\":\"Hi\"}"`

Request body: `{ "message": "your text" }`  
Response: `{ "reply", "intent", "suggested_services", "confidence" }`

See project root **API.md** for full developer integration guide.
