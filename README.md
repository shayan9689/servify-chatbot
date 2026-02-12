# Servify Chatbot Backend

Node.js API for the Servify Generations chatbot. One endpoint: **POST /v1/chat** — send a message, get a reply (stateless, no auth).

## Requirements

- Node.js 18+
- **OPENAI_API_KEY** (in `backend/.env`)

## Setup & run

**From project root:** (uses `backend/.env` or project root `.env` for `OPENAI_API_KEY`)
```bash
npm run install:backend
npm start
```

**Or from the backend folder:**
```bash
cd backend
npm install
# Optional: copy .env.example to .env and set OPENAI_API_KEY (or use root .env)
npm start
```

Server runs at **http://127.0.0.1:8000** (or `PORT` in `.env`).

## Test with Thunder Client

1. Start the server: `cd backend && npm start`
2. In VS Code, open **Thunder Client** (or install from Extensions)
3. **Health check:** New request → GET → `http://127.0.0.1:8000/v1/status` → Send
4. **Chat:** New request → POST → `http://127.0.0.1:8000/v1/chat`
   - Body: **JSON**
   - Example:
   ```json
   {
     "message": "Hi"
   }
   ```
   - Or try: `"What services do you offer?"`, `"How do I book a caregiver?"`
5. Send → you should get `reply`, `intent`, `suggested_services`, `confidence` in the response.

Same API works from any REST client (Postman, curl, or your frontend).

## API for developers

| Method | Path         | Description                          |
|--------|--------------|--------------------------------------|
| `GET`  | `/v1/status` | Health check                         |
| `POST` | `/v1/chat`   | Send message → reply (body: `{"message": "..."}`) |

**Response:** `reply`, `intent`, `suggested_services`, `confidence`.

Full guide and examples: **[API.md](API.md)**.

## Safety

- No medical diagnosis or prescriptions. No legal advice.
- Emergency phrases → fixed “call 911” response.
- Answers limited to Servify Generations (services, booking, Pro, home care).

## Deploy on Vercel

1. Push to GitHub and connect repo to Vercel.
2. In Vercel project **Settings → Environment Variables**, add `OPENAI_API_KEY` with your key.
3. Deploy. API will be at `https://servify-chatbot.vercel.app/v1/status` and `/v1/chat`.

## Project layout

```
api/index.js     # Vercel serverless entry
backend/
  server.js      # Express app, prompt, OpenAI, safety
  package.json
vercel.json      # Routes all requests to /api
package.json     # Root deps for Vercel
API.md           # Developer integration guide
README.md        # This file
```
