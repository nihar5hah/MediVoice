import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignScheduler } from './campaignScheduler.js';
import { JsonStore } from '../memory/store.js';

async function freshStore(): Promise<JsonStore> {
  const s = new JsonStore(':memory:' as never);
  (s as any).data = { patients: {}, sessions: {}, appointments: [], campaignLog: [] };
  (s as any).save = async () => {};
  return s;
}

describe('CampaignScheduler', () => {
  it('marks job as skipped and logs to store when no Vapi client', async () => {
    const store = await freshStore();
    const scheduler = new CampaignScheduler(null, '', '', store);
    const job = scheduler.schedule({
      patientId: 'p1',
      campaignType: 'reminder',
      destinationNumber: '+10000000000',
      scheduledAt: new Date(Date.now() - 1000),
    });
    await (scheduler as any).execute(job);
    expect(job.status).toBe('skipped');
    const logs = await store.listCampaignLogs();
    expect(logs.some(l => l.outcome === 'skipped')).toBe(true);
  });

  it('marks job as failed after 3 attempts and logs to store', async () => {
    const store = await freshStore();
    const fakeVapi = { createCall: vi.fn().mockRejectedValue(new Error('Vapi error')) };
    const scheduler = new CampaignScheduler(fakeVapi as any, 'phone-id', 'asst-id', store);
    const job = scheduler.schedule({
      patientId: 'p2',
      campaignType: 'follow_up',
      destinationNumber: '+10000000001',
      scheduledAt: new Date(Date.now() - 1000),
    });
    // Force 3 attempts
    job.attempts = 2;
    await (scheduler as any).execute(job);
    expect(job.status).toBe('failed');
    const logs = await store.listCampaignLogs();
    expect(logs.some(l => l.outcome === 'failed' && l.patientId === 'p2')).toBe(true);
  });

  it('retries job when Vapi fails and attempts < 3', async () => {
    const store = await freshStore();
    const fakeVapi = { createCall: vi.fn().mockRejectedValue(new Error('timeout')) };
    const scheduler = new CampaignScheduler(fakeVapi as any, 'phone-id', 'asst-id', store);
    const job = scheduler.schedule({
      patientId: 'p3',
      campaignType: 'reminder',
      destinationNumber: '+10000000002',
      scheduledAt: new Date(Date.now() - 1000),
    });
    await (scheduler as any).execute(job);
    expect(job.status).toBe('pending');
    expect(job.attempts).toBe(1);
  });

  it('cancelJob sets status to failed for pending jobs', () => {
    const scheduler = new CampaignScheduler(null, '', '');
    const job = scheduler.schedule({ patientId: 'p4', campaignType: 'reminder', destinationNumber: '+1', scheduledAt: new Date() });
    const result = scheduler.cancelJob(job.id);
    expect(result).toBe(true);
    expect(scheduler.listJobs().find(j => j.id === job.id)?.status).toBe('failed');
  });
});
