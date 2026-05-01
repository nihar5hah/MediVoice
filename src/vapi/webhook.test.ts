import { describe, it, expect } from 'vitest';
import { createVapiWebhookHandler } from './webhook.js';
import { JsonStore } from '../memory/store.js';

async function freshStore(): Promise<JsonStore> {
  const s = new JsonStore(':memory:' as never);
  (s as any).data = { patients: {}, sessions: {}, appointments: [], campaignLog: [] };
  (s as any).save = async () => {};
  return s;
}

function fakeCall() {
  return { id: 'call-test', orgId: 'org', createdAt: '', updatedAt: '', type: 'inboundPhoneCall' as const, status: 'in-progress', customer: { number: '+10000000000' } };
}

describe('webhook hardening', () => {
  it('returns a tool result (not throw) for malformed JSON arguments', async () => {
    const store = await freshStore();
    const handler = createVapiWebhookHandler(store);
    const body = {
      message: {
        type: 'tool-calls' as const,
        call: fakeCall(),
        toolCalls: [{ id: 'tc1', type: 'function' as const, function: { name: 'processTurn', arguments: '{bad json' } }]
      }
    };
    const result = await handler.handleToolCalls(body as any);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].toolCallId).toBe('tc1');
    expect(result.results[0].result).toMatch(/malformed|could not process/i);
  });

  it('returns a safe result for unknown tool name', async () => {
    const store = await freshStore();
    const handler = createVapiWebhookHandler(store);
    const body = {
      message: {
        type: 'tool-calls' as const,
        call: fakeCall(),
        toolCalls: [{ id: 'tc2', type: 'function' as const, function: { name: 'unknownTool', arguments: '{}' } }]
      }
    };
    const result = await handler.handleToolCalls(body as any);
    expect(result.results[0].result).toMatch(/unknown/i);
  });

  it('returns no utterance message when utterance is missing', async () => {
    const store = await freshStore();
    const handler = createVapiWebhookHandler(store);
    const body = {
      message: {
        type: 'tool-calls' as const,
        call: fakeCall(),
        toolCalls: [{ id: 'tc3', type: 'function' as const, function: { name: 'processTurn', arguments: '{}' } }]
      }
    };
    const result = await handler.handleToolCalls(body as any);
    expect(result.results[0].result).toMatch(/no utterance/i);
  });
});
