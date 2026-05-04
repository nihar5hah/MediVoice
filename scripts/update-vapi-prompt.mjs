import 'dotenv/config';

const VAPI_BASE_URL = 'https://api.vapi.ai';
const apiKey = process.env.VAPI_PRIVATE_KEY;
const assistantId = process.env.VAPI_ASSISTANT_ID;

if (!apiKey || !assistantId) {
  console.log('VAPI_PRIVATE_KEY or VAPI_ASSISTANT_ID not set');
  process.exit(0);
}

// 1. GET current assistant
const getResp = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
const assistant = await getResp.json();
if (!getResp.ok) { console.error('GET failed:', JSON.stringify(assistant)); process.exit(1); }

const currentModel = assistant.model;
const currentSystemMsg = currentModel?.messages?.find(m => m.role === 'system');
if (!currentSystemMsg) { console.error('No system message found'); process.exit(1); }

console.log('--- CURRENT system prompt (last 300 chars) ---');
console.log(currentSystemMsg.content.slice(-300));

// 2. Add the confirmation instruction to the processTurn section only
const ADDITION = `\n- Confirming or rejecting a proposed action (e.g. "yes", "no", "okay", "cancel that")`;

const OLD_SECTION = `Use processTurn for ALL scheduling actions and queries:
- Booking a new appointment
- Rescheduling an existing appointment
- Cancelling an appointment
- Checking available slots or doctor availability
- Fetching existing appointments for a patient`;

const NEW_SECTION = `Use processTurn for ALL scheduling actions and queries — including every patient response, even simple confirmations:
- Booking a new appointment
- Rescheduling an existing appointment
- Cancelling an appointment
- Checking available slots or doctor availability
- Fetching existing appointments for a patient
- Confirming or rejecting a proposed action ("yes", "no", "okay", "cancel that", or any confirmation/rejection)

**NEVER respond directly to "yes", "no", or any confirmation. Always call processTurn first.**`;

if (!currentSystemMsg.content.includes('Booking a new appointment')) {
  console.error('Could not find expected processTurn section in prompt. Aborting.');
  process.exit(1);
}

const updatedContent = currentSystemMsg.content.replace(OLD_SECTION, NEW_SECTION);

if (updatedContent === currentSystemMsg.content) {
  console.log('Section already updated or text not found exactly — check prompt manually.');
  process.exit(0);
}

// 3. PATCH back the FULL model object with only the message content changed
const updatedMessages = currentModel.messages.map(m =>
  m.role === 'system' ? { ...m, content: updatedContent } : m
);

const patchResp = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: { ...currentModel, messages: updatedMessages } })
});

const result = await patchResp.json();
if (!patchResp.ok) { console.error('PATCH failed:', JSON.stringify(result)); process.exit(1); }

console.log('\n--- UPDATED system prompt (processTurn section) ---');
const newContent = result.model?.messages?.find(m => m.role === 'system')?.content ?? '';
const idx = newContent.indexOf('Use processTurn');
console.log(newContent.slice(idx, idx + 600));
console.log('\nDone. toolIds preserved:', JSON.stringify(result.model?.toolIds));
