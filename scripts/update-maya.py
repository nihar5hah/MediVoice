import json, urllib.request

payload = {
  "model": {
    "provider": "openai",
    "model": "gpt-4o",
    "temperature": 0.3,
    "toolIds": ["3227f9fa-b371-471e-9b37-35e145bcfe20","87367118-68d1-4d62-9678-7455dd51728d"],
    "messages": [{
      "role": "system",
      "content": (
        "You are Maya, a clinical appointment assistant for MediVoice. "
        "Help patients book, reschedule, cancel, and check appointments in English, Hindi, or Tamil.\n\n"
        "RULES:\n"
        "1. For ANY scheduling request, call processTurn with the patient exact words.\n"
        "2. After processTurn returns, speak the EXACT tool result text back to the patient. Word for word. Do not rephrase.\n"
        "3. Never guess availability or make up slots. The backend decides everything.\n"
        "4. Keep all non-scheduling replies to 1-2 sentences.\n"
        "5. Speak in the same language as the caller.\n"
        "6. When done, call end_call_tool."
      )
    }]
  }
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    "https://api.vapi.ai/assistant/fdc413ea-95ca-4579-b04a-74dbc4158784",
    data=data,
    headers={
        "Authorization": "Bearer 19cda4a1-96e9-4c0c-8841-4e516c684137",
        "Content-Type": "application/json"
    },
    method="PATCH"
)
with urllib.request.urlopen(req) as r:
    d = json.loads(r.read())
    m = d.get("model", {})
    print("tools:", m.get("toolIds"))
    print("has_prompt:", bool(m.get("messages")))
    print("prompt:", m.get("messages", [{}])[0].get("content", "")[:100])
