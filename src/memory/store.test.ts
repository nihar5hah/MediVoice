import { describe, it, expect, beforeEach } from 'vitest';
import { JsonStore } from './store.js';

async function freshStore(): Promise<JsonStore> {
  const s = new JsonStore(':memory:' as never);
  (s as any).data = { patients: {}, sessions: {}, appointments: [], campaignLog: [] };
  (s as any).save = async () => {};
  return s;
}

const basePatient = { patientId: 'p1', languagePreference: 'en' as const, preferences: {}, history: [], updatedAt: new Date().toISOString() };
const baseAppt = { id: 'a1', patientId: 'p1', doctorId: 'doc-rao', doctorName: 'Dr. Rao', specialty: 'general medicine', startIso: new Date(Date.now() + 86400000).toISOString(), status: 'booked' as const };

describe('JsonStore API parity', () => {
  describe('patients', () => {
    it('listPatients returns all upserted patients', async () => {
      const store = await freshStore();
      await store.upsertPatient(basePatient);
      await store.upsertPatient({ ...basePatient, patientId: 'p2' });
      const list = await store.listPatients();
      expect(list).toHaveLength(2);
    });

    it('updatePatient changes language preference', async () => {
      const store = await freshStore();
      await store.upsertPatient(basePatient);
      const updated = await store.updatePatient('p1', { languagePreference: 'hi' });
      expect(updated?.languagePreference).toBe('hi');
    });

    it('updatePatient returns undefined for unknown patient', async () => {
      const store = await freshStore();
      const r = await store.updatePatient('ghost', { languagePreference: 'hi' });
      expect(r).toBeUndefined();
    });

    it('deletePatient removes patient, sessions, and appointments', async () => {
      const store = await freshStore();
      await store.upsertPatient(basePatient);
      await store.upsertAppointment(baseAppt);
      await store.upsertSession({ sessionId: 's1', patientId: 'p1', language: 'en', turns: 1, updatedAt: new Date().toISOString() });
      await store.deletePatient('p1');
      expect(await store.listPatients()).toHaveLength(0);
      expect(await store.listAppointments('p1')).toHaveLength(0);
      expect(await store.getSession('s1')).toBeUndefined();
    });
  });

  describe('appointments', () => {
    it('updateAppointment changes status', async () => {
      const store = await freshStore();
      await store.upsertAppointment(baseAppt);
      const updated = await store.updateAppointment('a1', { status: 'cancelled' });
      expect(updated?.status).toBe('cancelled');
    });

    it('updateAppointment returns undefined for unknown id', async () => {
      const store = await freshStore();
      const r = await store.updateAppointment('nope', { status: 'cancelled' });
      expect(r).toBeUndefined();
    });

    it('deleteAppointment removes the appointment', async () => {
      const store = await freshStore();
      await store.upsertAppointment(baseAppt);
      await store.deleteAppointment('a1');
      expect(await store.listAppointments('p1')).toHaveLength(0);
    });
  });

  describe('campaign logs', () => {
    it('listCampaignLogs returns all logged campaigns', async () => {
      const store = await freshStore();
      await store.logCampaign('p1', 'reminder', 'initiated');
      await store.logCampaign('p1', 'reminder', 'accepted');
      const logs = await store.listCampaignLogs();
      expect(logs).toHaveLength(2);
      expect(logs.map(l => l.outcome)).toContain('accepted');
    });
  });
});
