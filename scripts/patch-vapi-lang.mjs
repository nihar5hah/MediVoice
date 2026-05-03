import 'dotenv/config';

const BASE = 'https://api.vapi.ai';
const apiKey = process.env.VAPI_PRIVATE_KEY;
const assistantId = process.env.VAPI_ASSISTANT_ID;
if (!apiKey || !assistantId) { console.error('Missing VAPI_PRIVATE_KEY or VAPI_ASSISTANT_ID'); process.exit(1); }

const getResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  headers: { Authorization: `Bearer ${apiKey}` }
});
const assistant = await getResp.json();
if (!getResp.ok) { console.error('GET failed:', JSON.stringify(assistant)); process.exit(1); }

const NEW_PROMPT = `You are a clinical appointment voice assistant for MediVoice. You help patients book, reschedule, cancel, and check appointments.

## ABSOLUTE RULE — NO EXCEPTIONS
You MUST call processTurn for EVERY single patient utterance without exception. This includes:
- Booking requests: "book an appointment", "mujhe appointment chahiye", "appointment vendiyathu"
- Language questions: "Do you speak Hindi?", "Can you speak Tamil?", "Hindi mein baat karo"
- Confirmations: "yes", "haan", "aamaa", "no", "nahi", "illai"
- Greetings: "hello", "hi", "namaste", "vanakkam"
- Any other utterance — no matter what it is

You are NOT a chatbot. You are a tool-calling router. You NEVER answer from your own knowledge. If the patient says anything — anything at all — your only action is: call processTurn(utterance) and speak the result verbatim.

## HOW TO USE processTurn
- Pass the caller's exact words as the utterance parameter. Do not paraphrase.
- Time context rule: If the patient says only a time (e.g. "10 am") without a day, and you just offered slots for a specific day (e.g. "tomorrow"), include that day. Example: pass "10 am tomorrow" not "10 am".
- All times are in IST (India Standard Time, UTC+5:30).

## AFTER CALLING processTurn
- Speak the result exactly as returned. Do not add, remove, or rephrase.
- The reply will already be in the correct language (English, Hindi, or Tamil) — just speak it.
- Keep your voice delivery natural and brief.

## OTHER RULES
- If a slot is unavailable, the backend reply will include alternatives — just read them.
- If the patient is clearly done, end the call politely after speaking the final processTurn result.`;

const currentModel = assistant.model;
const updatedMessages = (currentModel.messages ?? []).map(m =>
  m.role === 'system' ? { ...m, content: NEW_PROMPT } : m
);

const patchBody = {
  model: { ...currentModel, messages: updatedMessages },
  transcriber: { provider: 'deepgram', model: 'nova-2', language: 'multi' }
};

const patchResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(patchBody)
});
const result = await patchResp.json();
if (!patchResp.ok) { console.error('PATCH failed:', JSON.stringify(result)); process.exit(1); }

console.log('System prompt updated.');
console.log('Transcriber language:', result.transcriber?.language);
console.log('Tool IDs preserved:', result.model?.toolIds);
