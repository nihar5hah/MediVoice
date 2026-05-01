import { describe, it, expect } from 'vitest';
import { JsonStore } from '../memory/store.js';
import { VoiceAgent } from './voiceAgent.js';

async function freshStore(): Promise<JsonStore> {
  const s = new JsonStore(':memory:' as never);
  (s as any).data = { patients: {}, sessions: {}, appointments: [], campaignLog: [] };
  (s as any).save = async () => {};
  return s;
}

async function turn(agent: VoiceAgent, utterance: string, patientId = 'p1', sessionId = 's1') {
  return agent.processTurn({ sessionId, patientId, utterance, mode: 'inbound' });
}

describe('multi-step booking intake', () => {
  it('asks which doctor when none specified', async () => {
    const store = await freshStore();
    const agent = new VoiceAgent(store);
    const r = await turn(agent, 'I want to book an appointment');
    expect(r.reply).toMatch(/which doctor|kaunse doctor|endha doctor/i);
    expect(r.session.gatheringBook?.step).toBe('doctor');
    expect(await store.listAppointments('p1')).toHaveLength(0);
  });

  it('asks for time after doctor is specified', async () => {
    const store = await freshStore();
    const agent = new VoiceAgent(store);
    await turn(agent, 'I want to book an appointment');
    const r = await turn(agent, 'Dr. Rao');
    expect(r.reply).toMatch(/available slots|slot|time/i);
    expect(r.session.gatheringBook?.step).toBe('time');
  });

  it('asks for name after doctor + time are both given', async () => {
    const store = await freshStore();
    const agent = new VoiceAgent(store);
    const r = await turn(agent, 'book with Dr. Rao tomorrow at 9am');
    expect(r.reply).toMatch(/name/i);
    expect(r.session.gatheringBook?.step).toBe('name');
    expect(await store.listAppointments('p1')).toHaveLength(0);
  });

  it('asks for confirmation after name is provided', async () => {
    const store = await freshStore();
    const agent = new VoiceAgent(store);
    await turn(agent, 'book with Dr. Rao tomorrow at 9am');
    const r = await turn(agent, 'John Doe');
    expect(r.reply).toMatch(/shall i book|confirm/i);
    expect(r.session.pendingConfirmation?.action).toBe('book');
  });

  it('books after full flow: doctor → time → name → yes', async () => {
    const store = await freshStore();
    const agent = new VoiceAgent(store);
    await turn(agent, 'book with Dr. Rao tomorrow at 9am');
    await turn(agent, 'John Doe');  // name
    const r = await turn(agent, 'yes');
    expect(r.reply).toMatch(/booked|appointment/i);
    const appts = await store.listAppointments('p1');
    expect(appts).toHaveLength(1);
    expect(appts[0].patientName).toBe('John Doe');
    expect(appts[0].status).toBe('booked');
  });

  it('skips name step for returning patient and goes straight to confirm', async () => {
    const store = await freshStore();
    (store as any).data.patients['p1'] = { patientId: 'p1', languagePreference: 'en', preferences: { name: 'Nihar' }, history: [], updatedAt: new Date().toISOString() };
    const agent = new VoiceAgent(store);
    const r = await turn(agent, 'book with Dr. Rao tomorrow at 9am');
    expect(r.reply).toMatch(/shall i book.*nihar|nihar.*shall i book/i);
    expect(r.session.pendingConfirmation?.action).toBe('book');
  });

  it('cancels gathering when patient says no', async () => {
    const store = await freshStore();
    const agent = new VoiceAgent(store);
    await turn(agent, 'I want to book an appointment');
    const r = await turn(agent, 'no');
    expect(r.reply).toMatch(/not made any changes|cancel|no problem/i);
    expect(r.session.gatheringBook).toBeUndefined();
    expect(await store.listAppointments('p1')).toHaveLength(0);
  });
});

describe('barge-in / intent switching', () => {
  it('clears pending confirmation and processes new book intent', async () => {
    const store = await freshStore();
    // Pre-seed patient name so gathering goes straight to confirmation
    (store as any).data.patients['p1'] = { patientId: 'p1', languagePreference: 'en', preferences: { name: 'Test User' }, history: [], updatedAt: new Date().toISOString() };
    const agent = new VoiceAgent(store);
    // Turn 1: book Dr. Rao → straight to pending confirmation (name already known)
    await turn(agent, 'book with Dr. Rao tomorrow at 9am');
    // Barge-in: ask to book Dr. Mehta instead
    const r = await turn(agent, 'book with Dr. Mehta tomorrow at 10am');
    expect(r.reply).toMatch(/shall i book|confirm/i);
    expect(r.session.pendingConfirmation?.doctorId).toBe('doc-mehta');
    expect(await store.listAppointments('p1')).toHaveLength(0);
  });

  it('re-asks pending question when utterance is unrecognised', async () => {
    const store = await freshStore();
    (store as any).data.patients['p1'] = { patientId: 'p1', languagePreference: 'en', preferences: { name: 'Test User' }, history: [], updatedAt: new Date().toISOString() };
    const agent = new VoiceAgent(store);
    await turn(agent, 'book with Dr. Rao tomorrow at 9am'); // → confirmation (name known)
    const r = await turn(agent, 'umm what?');
    expect(r.reply).toMatch(/shall i book|confirm/i);
    expect(r.session.pendingConfirmation).toBeDefined();
  });
});

describe('cancel — ambiguity and single-appointment', () => {
  it('asks for clarification (not pendingConfirmation) when two active appointments with no doctor', async () => {
    const store = await freshStore();
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: 'doc-rao', doctorName: 'Dr. Rao', specialty: 'general medicine', startIso: new Date(Date.now() + 86400000).toISOString(), status: 'booked' },
      { id: 'a2', patientId: 'p1', doctorId: 'doc-mehta', doctorName: 'Dr. Mehta', specialty: 'cardiology', startIso: new Date(Date.now() + 172800000).toISOString(), status: 'booked' },
    ];
    const agent = new VoiceAgent(store);
    const r = await turn(agent, 'cancel my appointment');
    expect(r.reply).toMatch(/multiple appointments|Dr\. Rao|Dr\. Mehta/i);
    expect(r.session.pendingConfirmation).toBeUndefined();
  });

  it('asks for confirmation (not clarification) when only one active appointment exists', async () => {
    const store = await freshStore();
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: 'doc-rao', doctorName: 'Dr. Rao', specialty: 'general medicine', startIso: new Date(Date.now() + 86400000).toISOString(), status: 'booked' },
    ];
    const agent = new VoiceAgent(store);
    const r = await turn(agent, 'cancel my appointment');
    expect(r.reply).toMatch(/shall i cancel|confirm/i);
    expect(r.session.pendingConfirmation?.action).toBe('cancel');
    expect(r.session.pendingConfirmation?.appointmentId).toBe('a1');
  });
});

describe('cancel by doctor', () => {
  it('cancels the Mehta appointment when patient says cancel Dr. Mehta', async () => {
    const store = await freshStore();
    const { doctors } = await import('../tools/scheduling.js');
    (store as any).data.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: 'doc-rao', doctorName: 'Dr. Rao', specialty: 'general medicine', startIso: new Date(Date.now() + 86400000).toISOString(), status: 'booked' },
      { id: 'a2', patientId: 'p1', doctorId: 'doc-mehta', doctorName: 'Dr. Mehta', specialty: 'cardiology', startIso: new Date(Date.now() + 172800000).toISOString(), status: 'booked' },
    ];
    const agent = new VoiceAgent(store);
    const r1 = await turn(agent, 'cancel Dr. Mehta');
    expect(r1.reply).toMatch(/shall i cancel.*mehta|confirm/i);
    expect(r1.session.pendingConfirmation?.doctorId).toBe('doc-mehta');
    const r2 = await turn(agent, 'yes');
    expect(r2.reply).toMatch(/cancelled/i);
    const appts = await store.listAppointments('p1');
    const cancelled = appts.find(a => a.id === 'a2');
    const active = appts.find(a => a.id === 'a1');
    expect(cancelled?.status).toBe('cancelled');
    expect(active?.status).toBe('booked');
  });
});
