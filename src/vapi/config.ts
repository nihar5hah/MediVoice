export const DEFAULT_VAPI_ASSISTANT_NAME = 'MediVoice Scheduler';
export const DEFAULT_VAPI_VOICE_PROVIDER = 'vapi';
export const DEFAULT_VAPI_VOICE_ID = 'Clara';
export const DEFAULT_VAPI_TRANSCRIBER_PROVIDER = 'deepgram';
export const DEFAULT_VAPI_TRANSCRIBER_MODEL = 'nova-2';

const SYSTEM_PROMPT = `You are a clinical appointment voice assistant for MediVoice. You help patients book, reschedule, cancel, and check appointments.

## ABSOLUTE RULE — NO EXCEPTIONS
You MUST call processTurn for EVERY single patient utterance without exception. This includes:
- Booking requests: "book an appointment", "mujhe appointment chahiye", "appointment vendiyathu"
- Language questions: "Do you speak Hindi?", "Can you speak Tamil?", "Hindi mein baat karo"
- Confirmations: "yes", "haan", "aamaa", "no", "nahi", "illai"
- Greetings: "hello", "hi", "namaste", "vanakkam"
- Any other utterance — no matter what it is

You are NOT a chatbot. You are a tool-calling router. You NEVER answer from your own knowledge. If the patient says anything — anything at all — your only action is: call processTurn(utterance) and speak the result verbatim.

## HOW TO USE processTurn
- Pass the caller's exact words as the utterance parameter. Do not paraphrase.
- Time context rule: If the patient says only a time (e.g. "10 am") without a day, and you just offered slots for a specific day (e.g. "tomorrow"), include that day. Example: pass "10 am tomorrow" not "10 am".
- All times are in IST (India Standard Time, UTC+5:30).

## AFTER CALLING processTurn
- Speak the result exactly as returned. Do not add, remove, or rephrase.
- The reply will already be in the correct language (English, Hindi, or Tamil) — just speak it.
- Keep your voice delivery natural and brief.

## OTHER RULES
- If a slot is unavailable, the backend reply will include alternatives — just read them.
- If the patient is clearly done, end the call politely after speaking the final processTurn result.`;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getConfiguredPublicServerUrl() {
  const value = process.env.PUBLIC_SERVER_URL ?? process.env.VAPI_SERVER_URL ?? '';
  return value ? trimTrailingSlash(value) : '';
}

export async function resolvePublicServerUrl() {
  const configured = getConfiguredPublicServerUrl();
  if (configured) {
    return configured;
  }

  try {
    const response = await fetch('http://127.0.0.1:4040/api/tunnels');
    if (!response.ok) {
      return '';
    }

    const payload = await response.json() as {
      tunnels?: Array<{ public_url?: string; proto?: string }>;
    };

    const httpsTunnel = payload.tunnels?.find((tunnel) => tunnel.proto === 'https' && tunnel.public_url);
    return httpsTunnel?.public_url ? trimTrailingSlash(httpsTunnel.public_url) : '';
  } catch {
    return '';
  }
}

export function getWebhookUrl(baseUrl: string) {
  return `${trimTrailingSlash(baseUrl)}/api/vapi/webhook`;
}

export function getProcessTurnToolUrl(baseUrl: string) {
  return getWebhookUrl(baseUrl);
}

export function buildProcessTurnToolDefinition(baseUrl: string) {
  return {
    type: 'function' as const,
    async: false,
    function: {
      name: 'processTurn',
      description: 'Send the patient request to the scheduling backend and return the assistant reply.',
      parameters: {
        type: 'object',
        properties: {
          utterance: {
            type: 'string',
            description: 'The exact user utterance to process.'
          }
        },
        required: ['utterance']
      }
    },
    messages: [
      {
        type: 'request-start',
        content: 'Let me check that for you.'
      },
      {
        type: 'request-failed',
        content: 'I am having trouble reaching the appointment system right now.'
      }
    ],
    server: {
      url: getProcessTurnToolUrl(baseUrl)
    }
  };
}

export function buildAssistantDefinition(options: {
  firstMessage: string;
  language: string;
  toolIds?: string[];
  name?: string;
}) {
  const { firstMessage, language, toolIds = [], name = DEFAULT_VAPI_ASSISTANT_NAME } = options;

  return {
    name,
    firstMessage,
    voice: {
      provider: DEFAULT_VAPI_VOICE_PROVIDER as 'vapi',
      voiceId: DEFAULT_VAPI_VOICE_ID
    },
    model: {
      provider: 'openai' as const,
      model: 'gpt-4o',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        }
      ],
      ...(toolIds.length ? { toolIds } : {})
    },
    transcriber: {
      provider: DEFAULT_VAPI_TRANSCRIBER_PROVIDER as 'deepgram',
      model: DEFAULT_VAPI_TRANSCRIBER_MODEL,
      language: 'multi'
    },
    recordingEnabled: true,
    endCallFunctionEnabled: true,
    voicemailDetectionEnabled: true,
    backgroundDenoisingEnabled: true,
    stopSpeakingPlan: {
      voiceSeconds: 0.2,
      backoffSeconds: 1.0
    }
  };
}
