import 'dotenv/config';

const BASE = 'https://api.vapi.ai';
const apiKey = process.env.VAPI_PRIVATE_KEY;
const assistantId = process.env.VAPI_ASSISTANT_ID;
if (!apiKey || !assistantId) { console.error('Missing env vars'); process.exit(1); }

// ── 1. Patch assistant system prompt ─────────────────────────────────────────
const getResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  headers: { Authorization: `Bearer ${apiKey}` }
});
const assistant = await getResp.json();
if (!getResp.ok) { console.error('GET assistant failed'); process.exit(1); }

const currentModel = assistant.model;
const sysMsg = currentModel?.messages?.find(m => m.role === 'system');
if (!sysMsg) { console.error('No system message'); process.exit(1); }

let promptUpdated = false;

if (!sysMsg.content.includes('gathering question')) {
  // Add gathering rule right after the "Call this tool BEFORE" line
  const OLD_LINE = '- Call this tool BEFORE making any scheduling statement. The backend is the only source of truth.';
  const NEW_LINE = `- Call this tool BEFORE making any scheduling statement. The backend is the only source of truth.
- **Gathering rule**: If you asked the patient a question to gather information (e.g. "Which doctor?", "What time?", "What is your name?") and the patient gives any answer — you MUST call processTurn with their exact words. Never advance the conversation yourself.`;

  if (!sysMsg.content.includes(OLD_LINE.slice(0, 50))) {
    console.error('Could not find "Call this tool BEFORE" line in prompt. Skipping prompt patch.');
  } else {
    const updatedContent = sysMsg.content.replace(OLD_LINE, NEW_LINE);
    const updatedMessages = currentModel.messages.map(m =>
      m.role === 'system' ? { ...m, content: updatedContent } : m
    );
    const patchResp = await fetch(`${BASE}/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: { ...currentModel, messages: updatedMessages } })
    });
    const patchResult = await patchResp.json();
    if (!patchResp.ok) { console.error('Prompt PATCH failed:', JSON.stringify(patchResult)); }
    else { console.log('✓ System prompt patched with gathering rule'); promptUpdated = true; }
  }
} else {
  console.log('✓ Gathering rule already present');
}

// ── 2. Patch the processTurn tool request-start message ───────────────────────
const toolIds = assistant.model?.toolIds ?? [];
console.log(`\nFound ${toolIds.length} tools: ${toolIds.join(', ')}`);

for (const toolId of toolIds) {
  const tResp = await fetch(`${BASE}/tool/${toolId}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const tool = await tResp.json();
  if (!tResp.ok) { console.log(`  Could not fetch tool ${toolId}`); continue; }

  const name = tool.function?.name ?? tool.name ?? 'unknown';
  console.log(`  Tool: ${name}`);

  if (name !== 'processTurn') { console.log('  Skipping (not processTurn)'); continue; }

  const currentMessages = tool.messages ?? [];
  const hasRequestStart = currentMessages.some(m => m.type === 'request-start');
  const requestStartContent = currentMessages.find(m => m.type === 'request-start')?.content;

  if (requestStartContent === 'Ek moment...') {
    console.log('  ✓ request-start already updated'); continue;
  }

  // Replace request-start with language-neutral phrase
  const updatedMessages = currentMessages.map(m =>
    m.type === 'request-start' ? { ...m, content: 'Ek moment...' } : m
  );
  // If no request-start existed, add it
  if (!hasRequestStart) updatedMessages.push({ type: 'request-start', content: 'Ek moment...' });

  const tPatchResp = await fetch(`${BASE}/tool/${toolId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: updatedMessages })
  });
  const tPatchResult = await tPatchResp.json();
  if (!tPatchResp.ok) { console.log(`  Tool PATCH failed: ${JSON.stringify(tPatchResult).slice(0,200)}`); }
  else { console.log(`  ✓ request-start updated to "Ek moment..."`); }
}

console.log('\nDone.');
