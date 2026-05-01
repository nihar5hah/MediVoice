export const DEFAULT_VAPI_ASSISTANT_NAME = 'MediVoice Scheduler';
export const DEFAULT_VAPI_VOICE_PROVIDER = 'vapi';
export const DEFAULT_VAPI_VOICE_ID = 'Clara';
export const DEFAULT_VAPI_TRANSCRIBER_PROVIDER = 'deepgram';
export const DEFAULT_VAPI_TRANSCRIBER_MODEL = 'nova-2';

const SYSTEM_PROMPT = `You are a clinical appointment voice assistant for MediVoice. You help patients book, reschedule, cancel, and check appointments.

CRITICAL INSTRUCTIONS:
1. When the patient wants to book, reschedule, cancel, or check appointments, you MUST call the processTurn tool with the patient's exact message.
2. Do NOT perform scheduling from memory or guess availability. The local scheduling backend is the source of truth.
3. Speak naturally, empathetically, and briefly for voice. Prefer under 2 sentences when possible.
4. If the patient speaks Hindi or Tamil, respond in the same language.
5. If a slot is unavailable, offer the alternatives returned by the backend.
6. If the patient is done, politely end the conversation.`;

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
      language: language === 'hi' || language === 'ta' ? language : 'multi'
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
