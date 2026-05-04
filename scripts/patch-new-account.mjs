import 'dotenv/config';

const BASE = 'https://api.vapi.ai';
const apiKey = process.env.VAPI_PRIVATE_KEY;
const assistantId = process.env.VAPI_ASSISTANT_ID;
const serverUrl = 'https://medivoice-api-supabase.onrender.com';
const webhookUrl = `${serverUrl}/api/vapi/webhook`;

if (!apiKey || !assistantId) { console.error('Missing env vars'); process.exit(1); }

// 1. Fetch the copied assistant
const getResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  headers: { Authorization: `Bearer ${apiKey}` }
});
const assistant = await getResp.json();
if (!getResp.ok) { console.error('GET failed:', JSON.stringify(assistant)); process.exit(1); }

console.log('Assistant name:', assistant.name);
console.log('Current server URL:', assistant.serverUrl ?? '(not set)');
console.log('Tool IDs:', assistant.model?.toolIds);

const processTurnTool = assistant.model?.toolIds ?? [];
const sysMsg = assistant.model?.messages?.find(m => m.role === 'system');
console.log('\nSystem prompt first 200 chars:');
console.log(sysMsg?.content?.slice(0, 200) ?? 'NONE');

// 2. Patch server URL to Render webhook
const patchResp = await fetch(`${BASE}/assistant/${assistantId}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ serverUrl: webhookUrl })
});
const patchResult = await patchResp.json();
if (!patchResp.ok) { console.error('PATCH serverUrl failed:', JSON.stringify(patchResult)); process.exit(1); }
console.log('\n✓ Server URL updated to:', patchResult.serverUrl);

// 3. Find processTurn tool and print its ID so we can update .env
for (const toolId of processTurnTool) {
  const tResp = await fetch(`${BASE}/tool/${toolId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const tool = await tResp.json();
  const name = tool.function?.name ?? tool.name ?? '';
  if (name === 'processTurn') {
    console.log('\nprocessTurn tool ID:', toolId);
    console.log('→ Update VAPI_PROCESS_TURN_TOOL_ID in .env and Render to:', toolId);
  }
}

// 4. Verify transcriber
console.log('\nTranscriber:', JSON.stringify(patchResult.transcriber));
