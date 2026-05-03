import 'dotenv/config';

const VAPI_BASE_URL = 'https://api.vapi.ai';
const apiKey = process.env.VAPI_PRIVATE_KEY;
const assistantId = process.env.VAPI_ASSISTANT_ID;

if (!apiKey || !assistantId) { console.log('Env vars missing'); process.exit(0); }

// 1. GET current assistant
const getResp = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
const assistant = await getResp.json();
if (!getResp.ok) { console.error('GET failed:', JSON.stringify(assistant)); process.exit(1); }

const currentModel = assistant.model;
const currentSystemMsg = currentModel?.messages?.find(m => m.role === 'system');
if (!currentSystemMsg) { console.error('No system message found'); process.exit(1); }

// 2. Append time-context instruction to the "How to use it" section
const OLD = `**How to use it:**
- Pass the caller's exact words as the \`utterance\` parameter. Do not paraphrase.
- Example: caller says "I want to book with Dr. Rao on Friday morning" → call processTurn with utterance = "I want to book with Dr. Rao on Friday morning"`;

const NEW = `**How to use it:**
- Pass the caller's exact words as the \`utterance\` parameter. Do not paraphrase.
- Example: caller says "I want to book with Dr. Rao on Friday morning" → call processTurn with utterance = "I want to book with Dr. Rao on Friday morning"
- **Time context rule**: If the patient says only a time (e.g. "10 am", "3 pm") without a day, and the conversation context is clearly about a specific day (e.g. you just offered slots for "tomorrow"), include that day in the utterance you pass. Example: patient says "10 am" after you offered tomorrow's slots → pass utterance = "10 am tomorrow". This is the only enrichment allowed.
- All times are in IST (India Standard Time, UTC+5:30). The backend interprets every time as IST.`;

if (currentSystemMsg.content.includes('Time context rule')) {
  console.log('Time context rule already present — nothing to do.');
  process.exit(0);
}

if (!currentSystemMsg.content.includes('How to use it:')) {
  console.error('Could not find "How to use it:" section in prompt. Aborting.');
  process.exit(1);
}

const updatedContent = currentSystemMsg.content.replace(OLD, NEW);
if (updatedContent === currentSystemMsg.content) {
  console.log('Exact section not found — might already be updated or text differs. Printing current section:\n');
  const idx = currentSystemMsg.content.indexOf('How to use it:');
  console.log(currentSystemMsg.content.slice(idx, idx + 400));
  process.exit(1);
}

// 3. PATCH back with full model object
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

const newContent = result.model?.messages?.find(m => m.role === 'system')?.content ?? '';
const idx = newContent.indexOf('How to use it:');
console.log('Updated section:\n' + newContent.slice(idx, idx + 600));
console.log('\nDone. toolIds preserved:', JSON.stringify(result.model?.toolIds));
