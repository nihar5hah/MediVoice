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
const sysMsg = currentModel?.messages?.find(m => m.role === 'system');
if (!sysMsg) { console.error('No system message'); process.exit(1); }

if (sysMsg.content.includes('NEVER call end_call_tool proactively')) {
  console.log('✓ Guard already present'); process.exit(0);
}

// Replace the end_call_tool section with a much stricter rule
const OLD = `end_call_tool\n- Use end_call_tool when:\n  - The caller says goodbye, thank you and seems done, or explicitly asks to end the call.\n  - The task is fully complete and there is nothing else to do.\n- Before calling it, say a brief warm closing`;

const NEW = `end_call_tool\n**NEVER call end_call_tool proactively. NEVER call it because of silence, a pause, or because the greeting was delivered.** Only call it when the patient has explicitly said goodbye, "that's all", or asked to end the call — AND you have nothing further to do.\n\n- Before calling it, say a brief warm closing`;

if (!sysMsg.content.includes(OLD.slice(0, 50))) {
  console.error('Could not find end_call_tool section. Searching...');
  const idx = sysMsg.content.indexOf('end_call_tool');
  console.log(sysMsg.content.slice(idx, idx + 400));
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
if (!pResp.ok) { console.error('PATCH failed:', JSON.stringify(pResult)); process.exit(1); }

const newSys = pResult.model?.messages?.find(m => m.role === 'system');
const idx = newSys?.content?.indexOf('NEVER call end_call_tool') ?? -1;
console.log('✓ Patched. Verification:');
console.log(newSys?.content?.slice(idx, idx + 400));
