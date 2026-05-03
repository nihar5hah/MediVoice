import 'dotenv/config';
const r = await fetch(`https://api.vapi.ai/assistant/${process.env.VAPI_ASSISTANT_ID}`, {
  headers: { Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}` }
});
const a = await r.json();
const sys = a.model?.messages?.find(m => m.role === 'system');

console.log('=== TRANSCRIBER ===');
console.log(JSON.stringify(a.transcriber, null, 2));

console.log('\n=== FIRST MESSAGE ===');
console.log(a.firstMessage);

console.log('\n=== SYSTEM PROMPT (section 10 snippet) ===');
const idx = sys?.content?.indexOf('processTurn for ALL') ?? -1;
console.log(sys?.content?.slice(idx, idx + 600) ?? 'NOT FOUND');

console.log('\n=== HAS LANGUAGE QUESTION RULE ===');
console.log(sys?.content?.includes('Language questions:') ? 'YES ✓' : 'NO ✗');

console.log('\n=== TOOL IDs ===');
console.log(a.model?.toolIds);
