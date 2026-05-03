import 'dotenv/config';

const BASE = 'https://api.vapi.ai';
const apiKey = process.env.VAPI_PRIVATE_KEY;
const assistantId = process.env.VAPI_ASSISTANT_ID;
if (!apiKey || !assistantId) { console.error('Missing env vars'); process.exit(1); }

// ── 1. Remove static request-start from processTurn tool ─────────────────────
const aResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  headers: { Authorization: `Bearer ${apiKey}` }
});
const assistant = await aResp.json();
const toolIds = assistant.model?.toolIds ?? [];

for (const toolId of toolIds) {
  const tResp = await fetch(`${BASE}/tool/${toolId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const tool = await tResp.json();
  const name = tool.function?.name ?? tool.name ?? '';
  if (name !== 'processTurn') continue;

  // Remove the request-start message — LLM will speak the filler itself
  const updatedMessages = (tool.messages ?? []).filter(m => m.type !== 'request-start');
  const tPatch = await fetch(`${BASE}/tool/${toolId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: updatedMessages })
  });
  if (!tPatch.ok) { console.error('Tool PATCH failed:', await tPatch.text()); }
  else console.log('✓ Removed static request-start from processTurn tool');
}

// ── 2. Add filler instruction to system prompt ────────────────────────────────
const currentModel = assistant.model;
const sysMsg = currentModel?.messages?.find(m => m.role === 'system');
if (!sysMsg) { console.error('No system message'); process.exit(1); }

if (sysMsg.content.includes('speak a brief filler')) {
  console.log('✓ Filler instruction already present');
  process.exit(0);
}

const OLD = `- **Gathering rule**: If you asked the patient a question to gather information (e.g. "Which doctor?", "What time?", "What is your name?") and the patient gives any answer — you MUST call processTurn with their exact words. Never advance the conversation yourself.`;

const NEW = `- **Gathering rule**: If you asked the patient a question to gather information (e.g. "Which doctor?", "What time?", "What is your name?") and the patient gives any answer — you MUST call processTurn with their exact words. Never advance the conversation yourself.
- **Filler before tool call**: Before every processTurn call, speak a brief filler phrase in the patient's current language so there is no silence. Use exactly: English → "Let me check that for you.", Hindi → "Ek moment...", Tamil → "Oru nimisham...". Speak the filler, then immediately call processTurn in the same turn.`;

if (!sysMsg.content.includes(OLD.slice(0, 60))) {
  console.error('Could not find gathering rule line. Current prompt section:');
  const i = sysMsg.content.indexOf('gathering');
  console.log(sysMsg.content.slice(i, i + 300));
  process.exit(1);
}

const updatedContent = sysMsg.content.replace(OLD, NEW);
const updatedMessages = currentModel.messages.map(m =>
  m.role === 'system' ? { ...m, content: updatedContent } : m
);

const pResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: { ...currentModel, messages: updatedMessages } })
});
const pResult = await pResp.json();
if (!pResp.ok) { console.error('Prompt PATCH failed:', JSON.stringify(pResult)); process.exit(1); }

const newSys = pResult.model?.messages?.find(m => m.role === 'system');
console.log('✓ Filler instruction added. Verification:');
const idx = newSys?.content?.indexOf('Filler before tool call') ?? -1;
console.log(newSys?.content?.slice(idx, idx + 300));
