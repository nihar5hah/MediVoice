/**
 * Switches the Vapi assistant to:
 * - Transcriber: Gladia (per-utterance auto language detection — handles EN/HI/TA code-switching)
 * - Voice: ElevenLabs eleven_multilingual_v2 (native Hindi + Tamil TTS pronunciation)
 * - firstMessage: always asks language preference after greeting
 * - System prompt: always ask language at turn 1 before any scheduling action
 */
import 'dotenv/config';

const BASE = 'https://api.vapi.ai';
const apiKey = process.env.VAPI_PRIVATE_KEY;
const assistantId = process.env.VAPI_ASSISTANT_ID;
if (!apiKey || !assistantId) { console.error('Missing env vars'); process.exit(1); }

const aResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  headers: { Authorization: `Bearer ${apiKey}` }
});
const assistant = await aResp.json();
const currentModel = assistant.model;

// --- 1. New transcriber: Gladia with automatic multilingual detection ---
const newTranscriber = {
  provider: 'gladia',
  model: 'solaria-1',
};

// --- 2. New voice: ElevenLabs multilingual v2 (Charlotte — neutral professional female) ---
const newVoice = {
  provider: '11labs',
  voiceId: 'XB0fDUnXU5powFXDhCwa', // Charlotte — works well with eleven_multilingual_v2
  model: 'eleven_multilingual_v2',
  stability: 0.5,
  similarityBoost: 0.75,
};

// --- 3. New firstMessage: ask language right away ---
const newFirstMessage =
  'Hi, this is Sarah from MediVoice. Would you prefer to continue in English, Hindi, or Tamil?';

// --- 4. Patch system prompt: always ask language before proceeding ---
const sysMsg = currentModel?.messages?.find(m => m.role === 'system');
if (!sysMsg) { console.error('No system message found'); process.exit(1); }

const OLD_OPENING = `**Inbound:** Greet warmly, introduce yourself as Sarah from MediVoice, and offer to help with scheduling. Detect the caller's language from their first response.`;

const NEW_OPENING = `**Inbound:** Your first message asks the caller to choose a language: "Would you prefer to continue in English, Hindi, or Tamil?" ALWAYS do this as the very first turn — before asking about any scheduling intent. Wait for the caller's language choice, then confirm it and switch immediately. Do NOT proceed to any scheduling question until the language is confirmed.
- If the caller responds in a language (e.g. speaks Hindi or Tamil directly), treat that as their choice.
- Once language is chosen, use it for ALL subsequent responses and tool calls.`;

if (!sysMsg.content.includes(OLD_OPENING.slice(0, 60))) {
  console.error('Could not find Opening section — manual check needed');
  console.log(sysMsg.content.slice(-800));
  process.exit(1);
}

const updatedContent = sysMsg.content.replace(OLD_OPENING, NEW_OPENING);
const updatedMessages = currentModel.messages.map(m =>
  m.role === 'system' ? { ...m, content: updatedContent } : m
);

// --- Apply all patches ---
const pResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcriber: newTranscriber,
    voice: newVoice,
    firstMessage: newFirstMessage,
    model: { ...currentModel, messages: updatedMessages },
  })
});
const result = await pResp.json();
if (!pResp.ok) { console.error('PATCH failed:', JSON.stringify(result)); process.exit(1); }

console.log('✓ Transcriber:', JSON.stringify(result.transcriber));
console.log('✓ Voice:', JSON.stringify(result.voice));
console.log('✓ firstMessage:', result.firstMessage);
const newSys = result.model?.messages?.find(m => m.role === 'system');
const idx = newSys?.content?.indexOf('ALWAYS do this as the very first turn') ?? -1;
console.log('✓ Prompt patched:', idx >= 0 ? 'YES' : 'NOT FOUND — check manually');
