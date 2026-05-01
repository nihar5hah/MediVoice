import type { AgentStore } from '../memory/storeInterface.js';
import { VoiceAgent } from '../agent/voiceAgent.js';
import { buildAssistantDefinition } from './config.js';

export interface VapiWebhookBody {
  message: {
    type: 'assistant-request' | 'function-call' | 'tool-calls' | 'end-of-call-report' | 'transcript' | 'conversation-update' | 'status-update' | 'speech-update' | 'model-output';
    call?: VapiCall;
    functionCall?: {
      name: string;
      parameters: Record<string, unknown>;
    };
    toolCalls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
    toolCallList?: Array<{
      id: string;
      name: string;
      parameters: Record<string, unknown>;
    }>;
    toolWithToolCallList?: Array<{
      name: string;
      toolCall: {
        id: string;
        parameters: Record<string, unknown>;
      };
    }>;
    transcript?: string;
    transcriptType?: 'final' | 'partial';
    conversation?: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>;
    status?: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
    endedReason?: string;
    analysis?: {
      summary?: string;
      successEvaluation?: string;
    };
  };
}

export interface VapiCall {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  type: 'inboundPhoneCall' | 'outboundPhoneCall' | 'webCall';
  status: string;
  assistantId?: string;
  customer?: {
    number?: string;
    name?: string;
  };
  phoneNumber?: {
    id: string;
    orgId: string;
    number: string;
    createdAt: string;
    updatedAt: string;
    name?: string;
  };
}

export interface VapiAssistantResponse {
  assistant?: {
    model?: {
      provider?: 'openai' | 'anthropic' | 'google' | 'anyscale' | 'perplexity' | 'deepseek';
      model?: string;
      messages?: Array<{ role: string; content: string }>;
      temperature?: number;
      maxTokens?: number;
    };
    voice?: {
      provider?: '11labs' | 'playht' | 'deepgram' | 'azure' | 'cartesia' | 'openai' | 'lmnt' | 'vapi';
      voiceId?: string;
    };
    firstMessage?: string;
    language?: string;
    recordingEnabled?: boolean;
    endCallFunctionEnabled?: boolean;
    dialKeypadFunctionEnabled?: boolean;
    voicemailDetectionEnabled?: boolean;
    voicemailMessage?: string;
    endCallPhrases?: string[];
    transcriber?: {
      provider?: 'deepgram' | 'talkscriber' | 'gladia' | 'assembly-ai';
      model?: string;
      language?: string;
    };
  };
}

export interface VapiFunctionCallResponse {
  results: Array<{
    toolCallId: string;
    result: string;
  }>;
}

function extractPatientId(call: VapiCall | undefined): string {
  // Use phone number as patient ID, or generate from call ID
  return call?.customer?.number?.replace(/\D/g, '') ?? `vapi-${call?.id ?? 'unknown'}`;
}

function extractSessionId(call: VapiCall | undefined): string {
  return `vapi-${call?.id ?? crypto.randomUUID()}`;
}

export function createVapiWebhookHandler(store: AgentStore) {
  const agent = new VoiceAgent(store);

  return {
    async handleAssistantRequest(body: VapiWebhookBody): Promise<VapiAssistantResponse> {
      const patientId = extractPatientId(body.message.call);

      // Start campaign to get patient context and language preference
      const campaign = await agent.startCampaign({ patientId, campaignType: 'reminder' });

      return {
        assistant: buildAssistantDefinition({
          firstMessage: campaign.prompt,
          language: campaign.patient.languagePreference ?? 'en'
        })
      };
    },

    async handleFunctionCall(body: VapiWebhookBody): Promise<VapiFunctionCallResponse> {
      const patientId = extractPatientId(body.message.call);
      const sessionId = extractSessionId(body.message.call);

      const functionCall = body.message.functionCall;
      if (!functionCall) {
        return { results: [] };
      }

      if (functionCall.name === 'processTurn') {
        const utterance = String(functionCall.parameters.utterance ?? '');
        if (!utterance) {
          return { results: [{ toolCallId: 'processTurn', result: 'No utterance provided.' }] };
        }

        const result = await agent.processTurn({
          sessionId,
          patientId,
          utterance,
          mode: 'inbound'
        });

        return {
          results: [{
            toolCallId: 'processTurn',
            result: result.reply
          }]
        };
      }

      if (functionCall.name === 'endCall') {
        return {
          results: [{
            toolCallId: 'endCall',
            result: 'Call ended by user request.'
          }]
        };
      }

      return { results: [] };
    },

    async handleToolCalls(body: VapiWebhookBody): Promise<VapiFunctionCallResponse> {
      const patientId = extractPatientId(body.message.call);
      const sessionId = extractSessionId(body.message.call);

      // Normalize a raw item to {id, name, parameters} regardless of Vapi format version
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalize = (tc: any): { id: string; name: string; parameters: Record<string, unknown>; parseError?: string } => {
        const id: string = tc.id ?? tc.toolCall?.id ?? '';
        const name: string = tc.name ?? tc.function?.name ?? tc.toolCall?.function?.name ?? '';
        const rawArgs = tc.parameters ?? tc.function?.arguments ?? tc.toolCall?.parameters ?? tc.toolCall?.function?.arguments ?? {};
        let parameters: Record<string, unknown> = {};
        let parseError: string | undefined;
        if (typeof rawArgs === 'string') {
          try { parameters = JSON.parse(rawArgs) as Record<string, unknown>; }
          catch (e) { parseError = `Malformed arguments: ${String(e)}`; }
        } else {
          parameters = rawArgs as Record<string, unknown>;
        }
        return { id, name, parameters, parseError };
      };

      // Collect from all possible Vapi payload formats and dedupe by id
      const seen = new Set<string>();
      const toolCalls: { id: string; name: string; parameters: Record<string, unknown>; parseError?: string }[] = [];
      for (const source of [
        body.message.toolCallList ?? [],
        body.message.toolWithToolCallList ?? [],
        body.message.toolCalls ?? [],
      ]) {
        for (const raw of source as unknown[]) {
          const tc = normalize(raw);
          if (tc.id && !seen.has(tc.id)) {
            seen.add(tc.id);
            toolCalls.push(tc);
          }
        }
      }

      console.log(`[Vapi Tool] calls: ${toolCalls.map(tc => `${tc.name}(${JSON.stringify(tc.parameters).slice(0,80)})`).join(', ')}`);

      const results = await Promise.all(
        toolCalls.map(async (toolCall) => {
          if (toolCall.parseError) {
            console.warn(`[Vapi Tool] Parse error for ${toolCall.name}: ${toolCall.parseError}`);
            return { toolCallId: toolCall.id, result: `Could not process request: ${toolCall.parseError}` };
          }
          if (toolCall.name === 'processTurn') {
            const args = toolCall.parameters as { utterance?: string };
            const utterance = args.utterance ?? '';
            if (!utterance) {
              return { toolCallId: toolCall.id, result: 'No utterance provided.' };
            }

            const result = await agent.processTurn({
              sessionId,
              patientId,
              utterance,
              mode: 'inbound'
            });

            console.log(`[Vapi Tool] processTurn reply: ${result.reply.slice(0, 120)}`);
            return { toolCallId: toolCall.id, result: result.reply };
          }

          if (toolCall.name === 'endCall' || toolCall.name === 'end_call_tool') {
            return { toolCallId: toolCall.id, result: 'Call ended.' };
          }

          console.warn(`[Vapi Tool] Unknown tool: ${toolCall.name}`);
          return { toolCallId: toolCall.id, result: 'Unknown function.' };
        })
      );

      return { results };
    },

    async handleEndOfCallReport(body: VapiWebhookBody): Promise<void> {
      const call = body.message.call;
      const patientId = extractPatientId(call);
      const analysis = body.message.analysis;

      console.log(`[Vapi] Call ended: ${call?.id}`);
      console.log(`[Vapi] Patient: ${patientId}`);
      console.log(`[Vapi] Summary: ${analysis?.summary ?? 'N/A'}`);
      console.log(`[Vapi] Success: ${analysis?.successEvaluation ?? 'N/A'}`);
    }
  };
}
