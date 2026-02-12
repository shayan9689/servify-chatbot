# Servify Chatbot API — Frontend Integration

**Base URL:** `https://servify-chatbot.vercel.app`

Stateless API: send a message, get a reply. No auth or sessions.

---

## Endpoints

### Health Check

**GET** `https://servify-chatbot.vercel.app/v1/status`

No body required.

**Response (200):**
```json
{
  "status": "ok"
}
```

---

### Chat (main endpoint)

**POST** `https://servify-chatbot.vercel.app/v1/chat`  
**Headers:** `Content-Type: application/json`

**Request body:**

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| `message` | string | Yes      | User's message  |

**Example request:**
```json
{
  "message": "What services do you offer?"
}
```

**Response (200):**

| Field                | Type     | Description                                  |
|----------------------|----------|----------------------------------------------|
| `reply`              | string   | Assistant reply (may include emojis)         |
| `intent`             | string   | Intent label (e.g. greeting, services_inquiry) |
| `suggested_services` | string[] | Suggested service names                      |
| `confidence`         | number   | 0.0–1.0                                      |

**Example response:**
```json
{
  "reply": "We offer home care, nursing, therapy, and daily assistance. 🏠 Want to know how to book?",
  "intent": "services_inquiry",
  "suggested_services": ["Home care", "Nursing", "Therapy"],
  "confidence": 0.9
}
```

---

## Error responses

| Status | Body example                                  |
|--------|-----------------------------------------------|
| 400    | `{ "detail": "message is required" }`         |
| 503    | `{ "detail": "OPENAI_API_KEY is not set" }`   |
| 500    | `{ "detail": "error message" }`               |

---

## CORS

All origins allowed. Call from any web or mobile frontend.

---

## JavaScript example

```javascript
const response = await fetch('https://servify-chatbot.vercel.app/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hi' }),
});

const data = await response.json();
// data.reply, data.intent, data.suggested_services, data.confidence
```

---

## cURL example

```bash
curl -X POST https://servify-chatbot.vercel.app/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi"}'
```
