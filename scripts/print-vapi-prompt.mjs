import 'dotenv/config';
const r = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
  headers: { Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}` }
});
const a = await r.json();
const sys = a.model?.messages?.find(m => m.role === 'system');
process.stdout.write(sys?.content ?? 'NO SYSTEM MESSAGE');
process.stdout.write('\n--- END ---\n');
