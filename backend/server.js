const path = require('path');
// Load backend/.env first, then project root .env (so root .env works if backend/.env is missing)
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// -----------------------------------------------------------------------------
// Platform knowledge (Servify Generations – Project Overview)
// -----------------------------------------------------------------------------
const PLATFORM_KNOWLEDGE = `
## Project: Servify Generations – Family & Home Services App
Platform: Servify (GoDaddy). Focus: healthcare services and daily assistance for elderly and home-bound users.

## Application overview
Servify Generations is a mobile app that supports elderly and home-bound users who want essential services at home. It works like Uber: it connects service seekers with verified service providers using location-based matching and integrated payments. The platform focuses primarily on healthcare services and also offers daily assistance services.

## User types
- **Service users**: Elderly or home-bound individuals (and their families). They can browse, select, and book nearby service providers. They can use the chatbot to understand services, get guidance, or request suggestions.
- **Service providers**: Healthcare workers, caregivers, therapists, and other professionals. They register, offer services, and receive bookings. Admin verifies providers and ensures services are safe.
- **Admin**: Handles platform operations, content, user management, payments, subscriptions, Pro version access, quality monitoring, and dispute resolution. Updates content such as videos, PDFs, and announcements.

## Service booking and location-based matching
- Users see nearby service providers using GPS.
- Service users can compare profiles, services, and pricing and choose the most suitable provider.
- Admin ensures providers are verified and services are safe.

## Payments and monetization
- Integrated secure payment system for all services.
- Pricing depends on service type, duration, and provider expertise.
- Admin monitors transactions and platform commission.
- Pro version subscription is managed and monitored by Admin.

## Educational content and learning resources
- Short free videos for all users.
- Pro users get full videos and downloadable PDFs.
- Admin manages content updates and quality (including caregiver modules, nutrition/educational content).

## Platform goals
- Provide safe, easy access to in-home services.
- Improve quality of life for elderly and dependent individuals.
- Enable income for service providers.
- Ensure platform profitability and sustainability.

## What the chatbot is for
The chatbot helps service users (and families) to: understand what services are available, get guidance on how to use the app (browse, compare, book), and request suggestions for suitable services or providers. It does not give medical diagnosis, prescriptions, or emergency care. For emergencies, users must contact 911 or their local emergency number. For diagnosis and treatment, users should see a licensed healthcare provider.
`.trim();

// -----------------------------------------------------------------------------
// Prompt engineering: to-the-point, friendly, engaging (emojis, no long blocks)
// -----------------------------------------------------------------------------
const SYSTEM_PROMPT_TEMPLATE = `You are the Servify Generations assistant. You are friendly, to the point, and easy to read. Your replies feel welcoming so users never hesitate to ask.

Style (strict):
- Answer only what was asked. Do not add long intros, extra details, or repeated info. Stay focused.
- Keep replies short: 2–4 sentences usually. If they ask for a list, use short bullet points (one line each).
- Use 1–3 emojis per reply where they fit naturally (e.g. 👋 for hello, 🏠 home care, 💳 payment, ✅ done, 📱 app, 🎯 for "here's what you need"). Do not overuse; never more than one per sentence.
- Warm and clear tone. No jargon. Write so elderly and families feel at ease.
- Never give medical diagnosis, prescriptions, or legal/financial advice. For emergencies, say to call 911. Then in one line offer Servify help (e.g. finding home care or booking).

Platform knowledge (use only to answer accurately; do not dump long blocks):
{platform_knowledge}

Greetings (e.g. Hi, Hello, Good morning):
- One short, warm reply with 👋. Say you're here for Servify—home care, booking, or services. One line invite: "What would you like to know?"

Off-topic or out-of-scope:
- One line acknowledge, then pivot: "I'm here for Servify Generations! 🏠 I can help with home care, booking, or Pro—what interests you?" No long explanations.

Rules:
- Servify only: services, booking, payments, Pro, content. Nothing else.
- Focused to the question: no filler, no walls of text. User should feel "that was quick and helpful."
- If they ask for medical/legal/financial advice: one line redirect (e.g. "Please check with a doctor for that. I can help you find home care or book a caregiver—want to know how? 💙") then stop.

After your reply, output a JSON block on a new line only (no other text after it):
\`\`\`json
{"intent": "short intent label", "suggested_services": ["service1", "service2"], "confidence": 0.0-1.0}
\`\`\`
`;

function getSystemPrompt() {
  return SYSTEM_PROMPT_TEMPLATE.replace('{platform_knowledge}', PLATFORM_KNOWLEDGE);
}

// -----------------------------------------------------------------------------
// Safety: emergency + out-of-scope (no medical/legal advice)
// -----------------------------------------------------------------------------
const EMERGENCY_PATTERNS = [
  /\b(emergency|911|suicide|kill myself|hurt myself)\b/i,
  /\b(chest pain|can't breathe|stroke|overdose)\b/i,
];
const MEDICAL_PATTERNS = [
  /\b(diagnos(e|is|ing)\s+me|diagnose\s+my)\b/i,
  /\b(prescrib(e|ing)|prescription\s+for\s+me)\b/i,
  /\b(what\s+medication|which\s+medication|should\s+i\s+take)\b/i,
  /\b(legal\s+advice|lawyer\s+for|court\s+advice)\b/i,
];

const EMERGENCY_RESPONSE = "If you're in an emergency, please call 911 or your local emergency number immediately. This chatbot can only help with Servify Generations—understanding services, booking, and guidance.";
const OUT_OF_SCOPE_RESPONSE = "I can only help with Servify Generations—services, booking, and app guidance. For diagnosis, prescriptions, or legal matters, please consult a qualified professional.";

function applySafety(text) {
  if (!text || !String(text).trim()) return { blocked: false };
  const lower = String(text).trim().toLowerCase();
  for (const pat of EMERGENCY_PATTERNS) {
    if (pat.test(lower)) return { blocked: true, reason: 'emergency', response: EMERGENCY_RESPONSE };
  }
  for (const pat of MEDICAL_PATTERNS) {
    if (pat.test(lower)) return { blocked: true, reason: 'out_of_scope', response: OUT_OF_SCOPE_RESPONSE };
  }
  return { blocked: false };
}

// -----------------------------------------------------------------------------
// Parse model output: reply text + JSON block (intent, suggested_services, confidence)
// -----------------------------------------------------------------------------
function parseStructuredTail(content) {
  if (!content || typeof content !== 'string') {
    return { reply: '', intent: 'general', suggested_services: [], confidence: 0.8 };
  }
  let reply = content.trim();
  let intent = 'general';
  let suggested_services = [];
  let confidence = 0.8;
  const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      intent = data.intent || intent;
      suggested_services = Array.isArray(data.suggested_services) ? data.suggested_services : [];
      confidence = typeof data.confidence === 'number' ? data.confidence : confidence;
      reply = content.slice(0, jsonMatch.index).trim();
    } catch (_) {}
  }
  return { reply, intent, suggested_services, confidence };
}

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------
app.get('/v1/status', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/v1/chat', async (req, res) => {
  const message = req.body?.message;
  if (message === undefined || message === null) {
    return res.status(400).json({ detail: 'message is required' });
  }
  const text = String(message).trim();
  if (!text) {
    return res.status(400).json({ detail: 'message cannot be empty' });
  }

  const safety = applySafety(text);
  if (safety.blocked) {
    return res.json({
      reply: safety.response,
      intent: safety.reason,
      suggested_services: [],
      confidence: 1,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ detail: 'OPENAI_API_KEY is not set' });
  }

  const openai = new OpenAI({ apiKey });
  const systemPrompt = getSystemPrompt();
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
    });
    const content = completion.choices?.[0]?.message?.content || '';
    const parsed = parseStructuredTail(content);
    if (!parsed.reply) {
      parsed.reply = "I couldn't generate a response. Please try again.";
      parsed.intent = 'error';
      parsed.confidence = 0;
    }
    return res.json({
      reply: parsed.reply,
      intent: parsed.intent,
      suggested_services: parsed.suggested_services,
      confidence: parsed.confidence,
    });
  } catch (err) {
    console.error('OpenAI error:', err);
    const detail = err.message || 'Chat processing failed';
    return res.status(500).json({ detail });
  }
});

// -----------------------------------------------------------------------------
// Start (only when run directly; export app for Vercel serverless)
// -----------------------------------------------------------------------------
module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servify Chatbot API (Node) running at http://127.0.0.1:${PORT}`);
    console.log(`  GET  /v1/status   - health check`);
    console.log(`  POST /v1/chat     - send message (body: { "message": "..." })`);
  });
}
