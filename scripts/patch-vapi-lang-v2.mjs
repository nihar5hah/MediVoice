import 'dotenv/config';

const BASE = 'https://api.vapi.ai';
const apiKey = process.env.VAPI_PRIVATE_KEY;
const assistantId = process.env.VAPI_ASSISTANT_ID;
if (!apiKey || !assistantId) { console.error('Missing env vars'); process.exit(1); }

// 1. GET current assistant
const getResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  headers: { Authorization: `Bearer ${apiKey}` }
});
const assistant = await getResp.json();
if (!getResp.ok) { console.error('GET failed:', JSON.stringify(assistant)); process.exit(1); }

const currentModel = assistant.model;
const sysMsg = currentModel?.messages?.find(m => m.role === 'system');
if (!sysMsg) { console.error('No system message found'); process.exit(1); }

// 2. Guard: don't apply twice
if (sysMsg.content.includes('Language questions:')) {
  console.log('Language rule already present — nothing to do.');
  process.exit(0);
}

// 3. Targeted insertion: add language questions to the processTurn usage list
//    Find the last bullet in that list and append after it
const OLD = `- Confirming or rejecting a proposed action ("yes", "no", "okay", "cancel that", or any confirmation/rejection)

**NEVER respond directly to "yes", "no", or any confirmation. Always call processTurn first.**`;

const NEW = `- Confirming or rejecting a proposed action ("yes", "no", "okay", "cancel that", or any confirmation/rejection)
- Language questions: "Do you speak Hindi?", "Can you speak Tamil?", "Hindi mein baat karo" — route these to processTurn exactly like any other utterance

**NEVER respond directly to "yes", "no", any confirmation, or any language question. Always call processTurn first.**`;

if (!sysMsg.content.includes(OLD.slice(0, 60))) {
  console.error('Could not find target section. Current section 10 snippet:');
  const idx = sysMsg.content.indexOf('processTurn for ALL');
  console.log(sysMsg.content.slice(idx, idx + 500));
  process.exit(1);
}

const updatedContent = sysMsg.content.replace(OLD, NEW);
if (updatedContent === sysMsg.content) {
  console.error('Replace had no effect — exact text not matched.');
  process.exit(1);
}

// 4. PATCH — only update messages, preserve everything else
const updatedMessages = currentModel.messages.map(m =>
  m.role === 'system' ? { ...m, content: updatedContent } : m
);

const patchResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: { ...currentModel, messages: updatedMessages } })
});
const result = await patchResp.json();
if (!patchResp.ok) { console.error('PATCH failed:', JSON.stringify(result)); process.exit(1); }

// 5. Verify
const resultSys = result.model?.messages?.find(m => m.role === 'system');
const idx = resultSys?.content?.indexOf('Language questions:') ?? -1;
if (idx === -1) {
  console.error('Verification failed — change not reflected in response');
  process.exit(1);
}
console.log('Done. Updated section:\n');
console.log(resultSys.content.slice(idx - 100, idx + 250));
console.log('\nTool IDs preserved:', JSON.stringify(result.model?.toolIds));
