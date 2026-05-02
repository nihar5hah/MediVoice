import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JsonStore } from '../memory/store.js';
import { SupabaseStore } from '../memory/supabaseStore.js';
import type { AgentStore } from '../memory/storeInterface.js';
import { VoiceAgent } from '../agent/voiceAgent.js';
import { VapiClient } from '../vapi/client.js';
import { buildAssistantDefinition, getConfiguredPublicServerUrl, getProcessTurnToolUrl, getWebhookUrl } from '../vapi/config.js';
import { createVapiWebhookHandler } from '../vapi/webhook.js';
import type { CampaignRequest, VoiceTurnRequest } from '../shared/types.js';
import { CampaignScheduler } from '../agent/campaignScheduler.js';

function createStore(): AgentStore {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Using Supabase for persistence');
    return new SupabaseStore();
  }
  console.log('Using JSON file store for persistence');
  return new JsonStore();
}

const store = createStore();
if (store instanceof JsonStore) { // JsonStore needs explicit load; SupabaseStore is always ready
  await store.load();
}

const agent = new VoiceAgent(store);
const vapiClient = process.env.VAPI_PRIVATE_KEY ? new VapiClient() : null;
const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID ?? '';
const vapiAssistantId = process.env.VAPI_ASSISTANT_ID ?? '';
const configuredPublicServerUrl = getConfiguredPublicServerUrl();
const vapiWebhook = createVapiWebhookHandler(store);
const scheduler = new CampaignScheduler(vapiClient, vapiPhoneNumberId, vapiAssistantId, store);
scheduler.start();

const app = express();
app.set('trust proxy', true);
const port = Number(process.env.PORT ?? 8787);
const serveClient = process.env.SERVE_CLIENT === 'true'
  || (process.env.SERVE_CLIENT !== 'false' && process.env.NODE_ENV !== 'production');

app.use(express.json());

function resolveRequestPublicServerUrl(request: express.Request) {
  const configured = getConfiguredPublicServerUrl();
  if (configured) {
    return configured;
  }

  const forwardedProto = request.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.get('host') || '';
  const protocol = forwardedProto || request.protocol || 'https';
  return host ? `${protocol}://${host}` : '';
}

function serializePatient(memory: Awaited<ReturnType<AgentStore['listPatients']>>[number]) {
  return {
    patient_id: memory.patientId,
    language_preference: memory.languagePreference,
    preferences: memory.preferences,
    history: memory.history,
    updated_at: memory.updatedAt
  };
}

app.get('/api/health', (request, response) => {
  const services: Record<string, boolean> = {
    agent: true,
    supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    vapi: !!vapiClient,
    vapiPhoneNumber: !!vapiPhoneNumberId,
    vapiAssistant: !!vapiAssistantId,
    publicServerUrl: !!resolveRequestPublicServerUrl(request)
  };
  response.json({ ok: true, service: 'clinical-voice-agent', services });
});

app.get('/api/vapi/config', (request, response) => {
  const publicServerUrl = resolveRequestPublicServerUrl(request);
  response.json({
    ok: true,
    publicServerUrl: publicServerUrl || null,
    webhookUrl: publicServerUrl ? getWebhookUrl(publicServerUrl) : null,
    processTurnToolUrl: publicServerUrl ? getProcessTurnToolUrl(publicServerUrl) : null,
    assistantId: vapiAssistantId || null,
    phoneNumberId: vapiPhoneNumberId || null
  });
});

app.post('/api/voice-turn', async (request, response, next) => {
  try {
    const body = request.body as VoiceTurnRequest;
    if (!body.sessionId || !body.patientId || !body.utterance) {
      response.status(400).json({ error: 'sessionId, patientId, and utterance are required.' });
      return;
    }
    response.json(await agent.processTurn(body));
  } catch (error) {
    next(error);
  }
});

app.post('/api/campaign/start', async (request, response, next) => {
  try {
    const body = request.body as CampaignRequest;
    if (!body.patientId || !body.campaignType) {
      response.status(400).json({ error: 'patientId and campaignType are required.' });
      return;
    }
    response.json(await agent.startCampaign(body));
  } catch (error) {
    next(error);
  }
});

// Vapi webhook endpoint
app.post('/api/vapi/webhook', async (request, response, next) => {
  try {
    const body = request.body;
    const messageType = body.message?.type;

    console.log(`[Vapi Webhook] Received: ${messageType}`);

    if (messageType === 'assistant-request') {
      const result = await vapiWebhook.handleAssistantRequest(body);
      response.json(result);
      return;
    }

    if (messageType === 'function-call') {
      const result = await vapiWebhook.handleFunctionCall(body);
      response.json(result);
      return;
    }

    if (messageType === 'tool-calls') {
      const result = await vapiWebhook.handleToolCalls(body);
      response.json(result);
      return;
    }

    if (messageType === 'end-of-call-report') {
      await vapiWebhook.handleEndOfCallReport(body);
      response.json({ ok: true });
      return;
    }

    // For other message types, just acknowledge
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Vapi outbound call endpoint
app.post('/api/vapi/call', async (request, response, next) => {
  try {
    if (!vapiClient) {
      response.status(503).json({ error: 'Vapi is not configured. Set VAPI_PRIVATE_KEY.' });
      return;
    }

    const { destinationNumber, patientId, assistantId, name, phoneNumberId } = request.body;
    const resolvedPhoneNumberId = phoneNumberId ?? vapiPhoneNumberId;
    const resolvedAssistantId = assistantId ?? vapiAssistantId;

    if (!destinationNumber) {
      response.status(400).json({ error: 'destinationNumber is required.' });
      return;
    }

    if (!resolvedPhoneNumberId) {
      response.status(400).json({ error: 'phoneNumberId is required. Set VAPI_PHONE_NUMBER_ID or pass it in the request.' });
      return;
    }

    // Get patient context for personalized first message
    const campaign = await agent.startCampaign({ patientId: patientId ?? destinationNumber, campaignType: 'reminder' });

    const call = await vapiClient.createCall({
      assistantId: resolvedAssistantId || undefined,
      assistant: resolvedAssistantId ? undefined : buildAssistantDefinition({
        firstMessage: campaign.prompt,
        language: campaign.patient.languagePreference ?? 'en'
      }),
      phoneNumberId: resolvedPhoneNumberId,
      customer: {
        number: destinationNumber,
        name: name ?? patientId ?? destinationNumber
      },
      name: name ?? `Campaign-${patientId ?? destinationNumber}`
    });

    response.json({ ok: true, call });
  } catch (error) {
    next(error);
  }
});

// List recent Vapi calls
app.get('/api/vapi/calls', async (_request, response, next) => {
  try {
    if (!vapiClient) {
      response.status(503).json({ error: 'Vapi is not configured. Set VAPI_PRIVATE_KEY.' });
      return;
    }

    const calls = await vapiClient.listCalls(20);
    response.json(calls);
  } catch (error) {
    next(error);
  }
});

// Get all appointments
app.get('/api/appointments', async (_request, response, next) => {
  try {
    const appointments = await store.listAppointments();
    response.json({ appointments });
  } catch (error) {
    next(error);
  }
});

// Get appointments by patient
app.get('/api/appointments/:patientId', async (request, response, next) => {
  try {
    const appointments = await store.listAppointments(request.params.patientId);
    response.json({ appointments });
  } catch (error) {
    next(error);
  }
});

// Get all patients
app.get('/api/patients', async (_request, response, next) => {
  try {
    const patients = await store.listPatients();
    response.json({ patients: patients.map(serializePatient) });
  } catch (error) { next(error); }
});

// Update appointment status
app.patch('/api/appointments/:id', async (request, response, next) => {
  try {
    const { id } = request.params;
    const { status, startIso } = request.body as { status?: string; startIso?: string };
    const updated = await store.updateAppointment(id, {
      ...(status && { status: status as 'booked' | 'cancelled' | 'completed' }),
      ...(startIso && { startIso })
    });
    if (!updated) { response.status(404).json({ error: 'Appointment not found.' }); return; }
    response.json({ ok: true, appointment: updated });
  } catch (error) { next(error); }
});

// Delete appointment
app.delete('/api/appointments/:id', async (request, response, next) => {
  try {
    await store.deleteAppointment(request.params.id);
    response.json({ ok: true });
  } catch (error) { next(error); }
});

// Update patient
app.patch('/api/patients/:patientId', async (request, response, next) => {
  try {
    const { patientId } = request.params;
    const { language_preference, preferences } = request.body as { language_preference?: string; preferences?: Record<string, unknown> };
    const updated = await store.updatePatient(patientId, {
      ...(language_preference && { languagePreference: language_preference as 'en' | 'hi' | 'ta' }),
      ...(preferences && { preferences })
    });
    if (!updated) { response.status(404).json({ error: 'Patient not found.' }); return; }
    response.json({ ok: true, patient: serializePatient(updated) });
  } catch (error) { next(error); }
});

// Delete patient
app.delete('/api/patients/:patientId', async (request, response, next) => {
  try {
    await store.deletePatient(request.params.patientId);
    response.json({ ok: true });
  } catch (error) { next(error); }
});

// Analytics summary (computed from store methods — works for both JSON and Supabase mode)
app.get('/api/analytics', async (_request, response, next) => {
  try {
    const [appointments, patients, campaignLogs] = await Promise.all([
      store.listAppointments(),
      store.listPatients(),
      store.listCampaignLogs(),
    ]);
    const totalAppointments = appointments.length;
    const booked = appointments.filter(a => a.status === 'booked').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const totalPatients = patients.length;
    const langDist = patients.reduce((acc: Record<string, number>, p) => {
      acc[p.languagePreference] = (acc[p.languagePreference] ?? 0) + 1; return acc;
    }, {});
    const specialtyDist = appointments.reduce((acc: Record<string, number>, a) => {
      acc[a.specialty] = (acc[a.specialty] ?? 0) + 1; return acc;
    }, {});
    const doctorDist = appointments.reduce((acc: Record<string, number>, a) => {
      acc[a.doctorName] = (acc[a.doctorName] ?? 0) + 1; return acc;
    }, {});
    const totalCampaigns = campaignLogs.length;
    const campaignAccepted = campaignLogs.filter(c => c.outcome === 'accepted').length;
    response.json({
      totalAppointments, booked, cancelled, completed, totalPatients,
      languageDistribution: langDist, specialtyDistribution: specialtyDist, doctorDistribution: doctorDist,
      totalCampaigns, campaignAccepted, avgTurns: 0,
      recentAppointments: appointments.slice(-7).map(a => ({ date: a.startIso.slice(0, 10), status: a.status }))
    });
  } catch (error) { next(error); }
});

// Schedule an outbound campaign call
app.post('/api/campaigns/schedule', async (request, response, next) => {
  try {
    const { patientId, campaignType, destinationNumber, delayMinutes } = request.body as {
      patientId: string;
      campaignType: 'reminder' | 'follow_up';
      destinationNumber: string;
      delayMinutes?: number;
    };
    if (!patientId || !campaignType || !destinationNumber) {
      response.status(400).json({ error: 'patientId, campaignType, and destinationNumber are required.' });
      return;
    }
    const scheduledAt = new Date(Date.now() + (delayMinutes ?? 0) * 60_000);
    const job = scheduler.schedule({ patientId, campaignType, destinationNumber, scheduledAt });
    await store.logCampaign(patientId, campaignType, 'initiated');
    response.json({ ok: true, job });
  } catch (error) { next(error); }
});

// List all campaign jobs in the queue
app.get('/api/campaigns/jobs', (_request, response) => {
  response.json({ jobs: scheduler.listJobs() });
});

// Cancel a pending campaign job
app.delete('/api/campaigns/jobs/:id', (request, response) => {
  const cancelled = scheduler.cancelJob(request.params.id);
  if (cancelled) response.json({ ok: true });
  else response.status(404).json({ error: 'Job not found or not cancellable.' });
});

// Get all distinct doctors derived from appointments (works for both JSON and Supabase mode)
app.get('/api/doctors', async (_request, response, next) => {
  try {
    const appointments = await store.listAppointments();
    const doctorMap = new Map<string, { id: string; name: string; specialty: string; appointments: number }>();
    for (const a of appointments) {
      if (!doctorMap.has(a.doctorId)) {
        doctorMap.set(a.doctorId, { id: a.doctorId, name: a.doctorName, specialty: a.specialty, appointments: 0 });
      }
      doctorMap.get(a.doctorId)!.appointments++;
    }
    response.json({ doctors: Array.from(doctorMap.values()) });
  } catch (error) { next(error); }
});

// Get all campaign logs
app.get('/api/campaigns', async (_request, response, next) => {
  try {
    const logs = await store.listCampaignLogs();
    const campaigns = logs.map((l, i) => ({ id: i + 1, patient_id: l.patientId, campaign_type: l.campaignType, outcome: l.outcome, at: l.at }));
    response.json({ campaigns });
  } catch (error) { next(error); }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected server error' });
});

const clientDist = join(dirname(fileURLToPath(import.meta.url)), '..', 'client');
if (serveClient) {
  app.use(express.static(clientDist));
  app.use((_request, response) => response.sendFile(join(clientDist, 'index.html')));
} else {
  app.get('/', (_request, response) => {
    response.json({
      ok: true,
      service: 'clinical-voice-agent',
      mode: 'api-only'
    });
  });
}

app.listen(port, () => {
  console.log(`Clinical voice agent API listening on http://localhost:${port}`);
  if (vapiClient) {
    console.log(`Vapi integration enabled`);
  }
});
