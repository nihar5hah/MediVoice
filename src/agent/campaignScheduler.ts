import type { VapiClient } from '../vapi/client.js';
import type { AgentStore } from '../memory/storeInterface.js';

export interface CampaignJob {
  id: string;
  patientId: string;
  campaignType: 'reminder' | 'follow_up';
  destinationNumber: string;
  scheduledAt: Date;
  attempts: number;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  createdAt: Date;
}

export class CampaignScheduler {
  private queue: CampaignJob[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private phoneNumberId: string;
  private assistantId: string;

  constructor(
    private readonly vapiClient: VapiClient | null,
    phoneNumberId: string,
    assistantId: string,
    private readonly store?: AgentStore,
    private readonly pollIntervalMs = 15_000
  ) {
    this.phoneNumberId = phoneNumberId;
    this.assistantId = assistantId;
  }

  schedule(job: Omit<CampaignJob, 'id' | 'attempts' | 'status' | 'createdAt'>): CampaignJob {
    const entry: CampaignJob = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      attempts: 0,
      status: 'pending',
      createdAt: new Date()
    };
    this.queue.push(entry);
    console.log(`[CampaignScheduler] Queued job ${entry.id} for ${entry.patientId} at ${entry.scheduledAt.toISOString()}`);
    return entry;
  }

  start(): void {
    if (this.timer) return;
    console.log(`[CampaignScheduler] Starting poller every ${this.pollIntervalMs}ms`);
    this.timer = setInterval(() => void this.poll(), this.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[CampaignScheduler] Stopped');
    }
  }

  listJobs(): CampaignJob[] {
    return [...this.queue];
  }

  cancelJob(id: string): boolean {
    const job = this.queue.find(j => j.id === id);
    if (!job || job.status !== 'pending') return false;
    job.status = 'failed';
    console.log(`[CampaignScheduler] Job ${id} cancelled by user`);
    return true;
  }

  private async poll(): Promise<void> {
    const now = new Date();
    const due = this.queue.filter(j => j.status === 'pending' && j.scheduledAt <= now);
    for (const job of due) {
      await this.execute(job);
    }
  }

  private async execute(job: CampaignJob): Promise<void> {
    job.status = 'running';
    job.attempts += 1;
    console.log(`[CampaignScheduler] Executing job ${job.id} (attempt ${job.attempts}) for ${job.patientId}`);

    if (!this.vapiClient) {
      console.warn('[CampaignScheduler] No Vapi client — skipping job');
      job.status = 'skipped';
      if (this.store) {
        await this.store.logCampaign(job.patientId, job.campaignType, 'skipped').catch(() => {});
      }
      return;
    }

    try {
      const call = await this.vapiClient.createCall({
        assistantId: this.assistantId || undefined,
        phoneNumberId: this.phoneNumberId,
        customer: { number: job.destinationNumber, name: job.patientId },
        name: `${job.campaignType}-${job.patientId}`
      });
      console.log(`[CampaignScheduler] Call created: ${call.id} for job ${job.id}`);
      job.status = 'done';
    } catch (error) {
      console.error(`[CampaignScheduler] Job ${job.id} failed:`, error instanceof Error ? error.message : error);
      if (job.attempts >= 3) {
        job.status = 'failed';
        console.error(`[CampaignScheduler] Job ${job.id} permanently failed after ${job.attempts} attempts`);
        if (this.store) {
          await this.store.logCampaign(job.patientId, job.campaignType, 'failed').catch(() => {});
        }
      } else {
        job.status = 'pending';
        job.scheduledAt = new Date(Date.now() + 60_000 * job.attempts);
        console.log(`[CampaignScheduler] Retrying job ${job.id} at ${job.scheduledAt.toISOString()}`);
      }
    }
  }
}
