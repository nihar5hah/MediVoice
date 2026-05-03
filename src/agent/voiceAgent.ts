import type { AgentTraceStep, CampaignRequest, PatientMemory, SessionState, VoiceTurnRequest, VoiceTurnResponse } from '../shared/types.js';
import type { AgentStore } from '../memory/storeInterface.js';
import { bookAppointment, cancelAppointment, checkAvailability, doctors, findActiveAppointment, nextSlots, rescheduleAppointment } from '../tools/scheduling.js';
import { detectLanguage, formatTime, say, type SayKey } from './language.js';
import { parseTurn } from './parser.js';

export class VoiceAgent {
  constructor(private readonly store: AgentStore) {}

  async processTurn(request: VoiceTurnRequest): Promise<VoiceTurnResponse> {
    const started = performance.now();
    const trace: AgentTraceStep[] = [];
    const mark = (step: string, detail: string) => trace.push({ at: new Date().toISOString(), step, detail, elapsedMs: Math.round(performance.now() - started) });

    // Load patient + session in parallel; use session language as fallback so the
    // language established on turn 1 carries through even for utterances like "yes" or "10 am"
    const [patient, existingSession] = await Promise.all([
      this.ensurePatient(request.patientId),
      this.store.getSession(request.sessionId)
    ]);
    // Within an existing session: keep the established language (turn 2+)
    // New session: always start from 'en' so the utterance detection runs fresh;
    // patient.languagePreference is from a previous call and must NOT override new detection
    const langFallback = existingSession?.language ?? 'en';
    const language = detectLanguage(request.utterance, langFallback);
    const session = existingSession ?? { sessionId: request.sessionId, patientId: request.patientId, language, turns: 0, updatedAt: new Date().toISOString() };
    session.language = language;
    session.turns += 1;
    mark('memory.load', `Loaded patient preference=${patient.languagePreference}, session lang=${langFallback}, detected=${language}, turns=${session.turns}`);

    const parsed = parseTurn(request.utterance, language);
    session.currentIntent = request.mode === 'outbound' && parsed.intent === 'clarify' ? 'campaign_response' : parsed.intent;
    mark('agent.parse', `intent=${session.currentIntent}, doctor=${parsed.doctorId ?? 'auto'}, start=${parsed.startIso ?? 'next-available'}`);

    let reply = say(language, 'clarify');

    // ── Pending confirmation resolution ──────────────────────────────────────
    const ACTIONABLE_INTENTS = new Set(['book','reschedule','cancel','list','check_availability']);
    const hadPending = !!session.pendingConfirmation;
    let bargedIn = false;
    if (session.pendingConfirmation) {
      const pending = session.pendingConfirmation;
      if (parsed.rejected) {
        session.pendingConfirmation = undefined;
        mark('confirm.denied', `Patient declined ${pending.action}`);
        reply = say(language, 'actionCancelled');
      } else if (parsed.accepted) {
        mark('confirm.accepted', `Executing confirmed ${pending.action}`);
        session.pendingConfirmation = undefined;
        if (pending.action === 'book') {
          const booked = await bookAppointment(request.patientId, { doctorId: pending.doctorId, startIso: pending.startIso, language }, this.store);
          mark('tool.bookAppointment', booked.message);
          if (booked.data && patient.preferences.name) {
            booked.data.patientName = patient.preferences.name;
            await this.store.upsertAppointment(booked.data);
          }
          reply = booked.data ? this.bookingReply(language, booked.data.doctorName, booked.data.startIso, patient.preferences.name) : say(language, 'noSlot');
        } else if (pending.action === 'cancel') {
          // Cancel the exact appointment that was confirmed, not just any booked appointment
          const appts = await this.store.listAppointments(request.patientId);
          const target = pending.appointmentId
            ? appts.find(a => a.id === pending.appointmentId && a.status === 'booked')
            : appts.find(a => a.status === 'booked');
          if (target) {
            const updated = await this.store.updateAppointment(target.id, { status: 'cancelled' });
            mark('tool.cancelAppointment', updated ? `Cancelled appointment ${target.id}` : `Update failed for ${target.id}`);
            reply = updated ? this.cancelReply(language) : say(language, 'cancelFailed');
          } else {
            reply = say(language, 'noActive');
          }
        } else if (pending.action === 'reschedule') {
          const result = await rescheduleAppointment(request.patientId, { doctorId: pending.doctorId, startIso: pending.startIso, language }, this.store, pending.appointmentId);
          mark('tool.rescheduleAppointment', result.message);
          reply = result.data ? this.rescheduleReply(language, result.data.doctorName, result.data.startIso) : say(language, 'noSlot');
        }
      } else if (ACTIONABLE_INTENTS.has(session.currentIntent ?? '')) {
        // Barge-in: patient switched to a new intent — clear pending + gathering and fall through
        mark('confirm.bargeIn', `Clearing pending ${pending.action}, new intent=${session.currentIntent}`);
        session.pendingConfirmation = undefined;
        session.gatheringBook = undefined;
        bargedIn = true;
      } else {
        // Patient said something unrecognised — re-ask the pending confirmation
        const doctor = pending.doctorId ?? '';
        const time = pending.startIso ? formatTime(pending.startIso, language) : '';
        const key: SayKey = pending.action === 'book' ? 'confirmBook' : pending.action === 'cancel' ? 'confirmCancel' : 'confirmReschedule';
        reply = say(language, key, { doctor, time });
      }
    }
    // ── Gathering: multi-step intake (doctor → time → name) ──────────────────────────
    const wasGathering = session.gatheringBook !== undefined;
    let gatheringHandled = false;
    if (wasGathering && !hadPending) {
      const g = session.gatheringBook!;
      if (parsed.rejected || session.currentIntent === 'cancel') {
        session.gatheringBook = undefined;
        reply = say(language, 'actionCancelled');
        gatheringHandled = true;
      } else if (g.step === 'doctor') {
        if (parsed.doctorId) {
          g.doctorId = parsed.doctorId;
          if (!g.startIso) {
            g.step = 'time';
            const { slots, doctor } = await nextSlots({ doctorId: g.doctorId, language }, this.store);
            mark('gather.doctor', `Got doctor ${doctor.name}, asking time`);
            reply = this.askTimeReply(language, doctor.name, slots);
          } else {
            reply = await this.advanceToNameOrConfirm(g, patient, session, language, mark, this.store);
          }
        } else {
          reply = this.askDoctorReply(language);
        }
        gatheringHandled = true;
      } else if (g.step === 'time') {
        if (parsed.startIso) {
          const avail = await checkAvailability({ doctorId: g.doctorId, startIso: parsed.startIso, language }, this.store);
          mark('gather.time', avail.message);
          if (!avail.ok) {
            const { slots, doctor } = await nextSlots({ doctorId: g.doctorId, language }, this.store);
            reply = this.askTimeReply(language, doctor.name, slots, avail.message);
          } else {
            g.startIso = avail.data!.slots[0];
            reply = await this.advanceToNameOrConfirm(g, patient, session, language, mark, this.store);
          }
        } else {
          const { slots, doctor } = await nextSlots({ doctorId: g.doctorId, language }, this.store);
          reply = this.askTimeReply(language, doctor.name, slots);
        }
        gatheringHandled = true;
      } else if (g.step === 'name') {
        const rawName = request.utterance.replace(/^(my (full )?name is|i am|i'm|naam hai|(full )?name is)\s*/i, '').trim();
        if (rawName.length > 0 && rawName.length < 80) {
          patient.preferences = { ...patient.preferences, name: rawName };
          mark('gather.name', `Got name: ${rawName}`);
          reply = await this.advanceToNameOrConfirm(g, patient, session, language, mark, this.store);
        } else {
          reply = say(language, 'askName');
        }
        gatheringHandled = true;
      }
    }

    // ── Intent handling: only runs when no pending existed, or barge-in cleared it ──────
    const runIntents = (!hadPending || bargedIn) && (!wasGathering || !gatheringHandled);
    if (runIntents && !session.pendingConfirmation && session.currentIntent === 'book') {
      const doctorId = parsed.doctorId;
      const startIso = parsed.startIso;
      if (!doctorId) {
        session.gatheringBook = { step: 'doctor', startIso };
        mark('gather.start', 'No doctor specified, entering gathering flow');
        reply = this.askDoctorReply(language);
      } else if (!startIso) {
        const { slots, doctor } = await nextSlots({ doctorId, language }, this.store);
        session.gatheringBook = { step: 'time', doctorId };
        mark('gather.start', `Has doctor ${doctor.name}, asking for time`);
        reply = this.askTimeReply(language, doctor.name, slots);
      } else {
        // Have both doctor and time, go straight to name/confirm
        const avail = await checkAvailability({ doctorId, startIso, language }, this.store);
        mark('tool.checkAvailability', avail.message);
        if (!avail.ok) {
          const { slots, doctor } = await nextSlots({ doctorId, language }, this.store);
          session.gatheringBook = { step: 'time', doctorId };
          reply = this.askTimeReply(language, doctor.name, slots, avail.message);
        } else {
          const g = { step: 'name' as const, doctorId: avail.data!.doctor.id, startIso: avail.data!.slots[0] };
          session.gatheringBook = g;
          reply = await this.advanceToNameOrConfirm(g, patient, session, language, mark, this.store);
        }
      }
    } else if (runIntents && !session.pendingConfirmation && session.currentIntent === 'reschedule') {
      const sel = await findActiveAppointment(request.patientId, { doctorId: parsed.doctorId, specialty: parsed.specialty }, this.store);
      if (sel.status === 'none') {
        reply = say(language, 'noActive');
      } else if (sel.status === 'ambiguous') {
        mark('confirm.ambiguous', `${sel.appointments.length} active appointments, no disambiguator`);
        const list = sel.appointments.map(a => `${a.doctorName} on ${formatTime(a.startIso, language)}`).join(', or ');
        reply = language === 'hi'
          ? `Aapke paas kai appointments hain: ${list}. Aap kaun si reschedule karna chahenge?`
          : language === 'ta'
          ? `Ungalukku pala appointments irukku: ${list}. Endha onnai reschedule panna virumbukireenga?`
          : `You have multiple appointments: ${list}. Which one would you like to reschedule?`;
      } else {
        const current = sel.appointment;
        if (parsed.startIso) {
          const avail = await checkAvailability({ doctorId: current.doctorId, startIso: parsed.startIso, language }, this.store);
          mark('tool.checkAvailability', avail.message);
          if (!avail.ok) {
            reply = this.alternativesReply(language, avail.data?.slots ?? []);
          } else {
            const slot = avail.data!.slots[0];
            session.pendingConfirmation = { action: 'reschedule', appointmentId: current.id, doctorId: avail.data!.doctor.id, startIso: slot };
            mark('confirm.pending', `Asking confirmation: reschedule to ${avail.data!.doctor.name} at ${slot}`);
            reply = say(language, 'confirmReschedule', { doctor: avail.data!.doctor.name, time: formatTime(slot, language) });
          }
        } else {
          const { slots, doctor } = await nextSlots({ ...parsed, doctorId: current.doctorId, language }, this.store);
          const slot = slots[0];
          if (!slot) {
            reply = say(language, 'noSlot');
          } else {
            session.pendingConfirmation = { action: 'reschedule', appointmentId: current.id, doctorId: doctor.id, startIso: slot };
            mark('confirm.pending', `Asking confirmation: reschedule to ${doctor.name} at ${slot}`);
            reply = say(language, 'confirmReschedule', { doctor: doctor.name, time: formatTime(slot, language) });
          }
        }
      }
    } else if (runIntents && !session.pendingConfirmation && session.currentIntent === 'cancel') {
      const sel = await findActiveAppointment(request.patientId, { doctorId: parsed.doctorId, specialty: parsed.specialty }, this.store);
      if (sel.status === 'none') {
        reply = say(language, 'noActive');
      } else if (sel.status === 'ambiguous') {
        mark('confirm.ambiguous', `${sel.appointments.length} active appointments, no disambiguator`);
        const list = sel.appointments.map(a => `${a.doctorName} on ${formatTime(a.startIso, language)}`).join(', or ');
        reply = language === 'hi'
          ? `Aapke paas kai appointments hain: ${list}. Aap kaun si cancel karna chahenge?`
          : language === 'ta'
          ? `Ungalukku pala appointments irukku: ${list}. Endha onnai cancel panna virumbukireenga?`
          : `You have multiple appointments: ${list}. Which one would you like to cancel?`;
      } else {
        const active = sel.appointment;
        session.pendingConfirmation = { action: 'cancel', appointmentId: active.id, doctorId: active.doctorId, startIso: active.startIso };
        mark('confirm.pending', `Asking confirmation: cancel ${active.doctorName} at ${active.startIso}`);
        reply = say(language, 'confirmCancel', { doctor: active.doctorName, time: formatTime(active.startIso, language) });
      }
    } else if (runIntents && !session.pendingConfirmation && session.currentIntent === 'list') {
      mark('tool.listAppointments', 'Listing active patient appointments');
      const appointments = await this.store.listAppointments(request.patientId);
      const active = appointments.filter((appointment) => appointment.status === 'booked');
      reply = active.length
        ? `${say(language, 'listed')} ${active.map((appointment) => `${appointment.doctorName} ${formatTime(appointment.startIso, language)}`).join('; ')}`
        : say(language, 'noActive');
    } else if (runIntents && !session.pendingConfirmation && session.currentIntent === 'check_availability') {
      if (parsed.doctorId) {
        const doc = doctors.find(d => d.id === parsed.doctorId)!;
        const { slots } = await nextSlots({ doctorId: parsed.doctorId, language }, this.store);
        mark('tool.checkAvailability', `Fetched next slots for ${doc.name}`);
        const formatted = slots.map(s => formatTime(s, language)).join(', ');
        reply = slots.length === 0
          ? (language === 'hi' ? `${doc.name} ke paas abhi koi slot available nahi hai.` : language === 'ta' ? `${doc.name} kittai ippo slot illai.` : `${doc.name} has no available slots at the moment.`)
          : (language === 'hi' ? `${doc.name} ke liye available slots hain: ${formatted}. Kya aap inme se koi book karna chahenge?` : language === 'ta' ? `${doc.name} available slots: ${formatted}. Book pannattuma?` : `${doc.name}'s next available slots are: ${formatted}. Would you like to book one?`);
      } else {
        mark('tool.checkDoctors', 'Listing available doctors from roster');
        const roster = doctors.map((d) => `${d.name} (${d.specialty})`).join(', ');
        reply = language === 'hi'
          ? `Hamare paas yeh doctors available hain: ${roster}. Aap kisse milna chahenge?`
          : language === 'ta'
          ? `Indha doctors available: ${roster}. Yaarai paarkka virukireenga?`
          : `We have these doctors available: ${roster}. Who would you like to see?`;
      }
    } else if (runIntents && !session.pendingConfirmation && session.currentIntent === 'campaign_response') {
      const outcome = parsed.rejected ? 'rejected' : parsed.accepted ? 'accepted' : 'needs_follow_up';
      await this.store.logCampaign(request.patientId, 'voice', outcome);
      mark('tool.logCampaignResponse', `outcome=${outcome}`);
      reply = parsed.rejected ? this.politeRejection(language) : parsed.accepted ? this.keepReply(language) : say(language, 'campaignIntro');
    }

    patient.languagePreference = language;
    patient.updatedAt = new Date().toISOString();
    patient.history = [`${new Date().toISOString()} ${session.currentIntent}: ${request.utterance}`, ...patient.history].slice(0, 12);
    session.updatedAt = new Date().toISOString();
    await this.store.upsertPatient(patient);
    await this.store.upsertSession(session);
    mark('memory.save', 'Persisted language preference, session state, and history');

    return {
      reply,
      language,
      latencyMs: Math.round(performance.now() - started),
      trace,
      session,
      appointments: await this.store.listAppointments(request.patientId)
    };
  }

  async startCampaign(request: CampaignRequest) {
    const patient = await this.ensurePatient(request.patientId);
    await this.store.logCampaign(request.patientId, request.campaignType, 'initiated');
    return {
      patient,
      prompt: say(patient.languagePreference, 'campaignIntro'),
      appointments: await this.store.listAppointments(request.patientId)
    };
  }

  private async ensurePatient(patientId: string): Promise<PatientMemory> {
    const existing = await this.store.getPatient(patientId);
    if (existing) return existing;
    const memory: PatientMemory = { patientId, languagePreference: 'en', preferences: {}, history: [], updatedAt: new Date().toISOString() };
    await this.store.upsertPatient(memory);
    return memory;
  }

  private bookingReply(language: PatientMemory['languagePreference'], doctor: string, iso: string, name?: string) {
    const time = formatTime(iso, language);
    const who = name ? ` for ${name}` : '';
    if (language === 'hi') { const kiske = name ? ` ${name} ke liye` : ''; return `Aapki appointment${kiske} ${doctor} ke saath ${time} par book ho gayi hai.`; }
    if (language === 'ta') { const kku = name ? ` ${name} kaaga` : ''; return `${kku} Ungal appointment ${doctor} kooda ${time} ku book panniyachu.`; }
    return `Your appointment with ${doctor} is booked for ${time}${who}.`;
  }

  private askDoctorReply(language: PatientMemory['languagePreference']): string {
    const roster = doctors.map(d => `${d.name} (${d.specialty})`).join(', ');
    if (language === 'hi') return `Aap kaunse doctor se milna chahenge? Hamare paas hain: ${roster}.`;
    if (language === 'ta') return `Endha doctor paarkka virumbukireenga? Engalukku iru: ${roster}.`;
    return `${say(language, 'askDoctor')} We have: ${roster}.`;
  }

  private askTimeReply(language: PatientMemory['languagePreference'], doctorName: string, slots: string[], reason?: string): string {
    const formatted = slots.map(s => formatTime(s, language)).join(', ');
    const prefix = reason ? (language === 'hi' ? `${reason} ` : language === 'ta' ? `${reason} ` : `${reason} `) : '';
    if (language === 'hi') return `${prefix}${doctorName} ke liye available slots hain: ${formatted || 'abhi koi slot nahi'}. Kaunsa time chahiye?`;
    if (language === 'ta') return `${prefix}${doctorName} available slots: ${formatted || 'ippo illai'}. Endha time venum?`;
    return `${prefix}${doctorName}'s available slots are: ${formatted || 'none currently'}. Which time works for you?`;
  }

  private async advanceToNameOrConfirm(
    g: NonNullable<import('../shared/types.js').SessionState['gatheringBook']>,
    patient: PatientMemory,
    session: import('../shared/types.js').SessionState,
    language: PatientMemory['languagePreference'],
    mark: (step: string, detail: string) => void,
    store: AgentStore
  ): Promise<string> {
    if (!patient.preferences.name) {
      g.step = 'name';
      return say(language, 'askName');
    }
    // All info collected — move to confirmation
    session.gatheringBook = undefined;
    const doc = doctors.find(d => d.id === g.doctorId);
    mark('confirm.pending', `Asking confirmation: book ${doc?.name} at ${g.startIso} for ${patient.preferences.name}`);
    session.pendingConfirmation = { action: 'book', doctorId: g.doctorId, startIso: g.startIso };
    const name = patient.preferences.name;
    const time = formatTime(g.startIso!, language);
    if (language === 'hi') return `Kya main ${doc?.name} ke saath ${time} par ${name} ke liye appointment book karoon? Haan boliye confirm karne ke liye.`;
    if (language === 'ta') return `${doc?.name} kooda ${time} la ${name} appointment book pannattuma? Aama sollunga confirm panna.`;
    return `Shall I book an appointment with ${doc?.name} at ${time} for ${name}? Say yes to confirm.`;
  }

  private rescheduleReply(language: PatientMemory['languagePreference'], doctor: string, iso: string) {
    const time = formatTime(iso, language);
    if (language === 'hi') return `Appointment reschedule ho gayi: ${doctor}, ${time}.`;
    if (language === 'ta') return `Appointment reschedule panniyachu: ${doctor}, ${time}.`;
    return `Your appointment is rescheduled with ${doctor} for ${time}.`;
  }

  private alternativesReply(language: PatientMemory['languagePreference'], slots: string[]) {
    const formatted = slots.map((slot) => formatTime(slot, language)).join(', ');
    if (language === 'hi') return formatted ? `Woh slot available nahi hai. Yeh options hain: ${formatted}.` : 'Woh slot available nahi hai. Kripya doosra time batayein.';
    if (language === 'ta') return formatted ? `Andha slot available illa. Indha options irukku: ${formatted}.` : 'Andha slot available illa. Vera time sollunga.';
    return formatted ? `That slot is not available. I can offer: ${formatted}.` : 'That slot is not available. Please suggest another time.';
  }

  private cancelReply(language: PatientMemory['languagePreference']) {
    if (language === 'hi') return 'Aapki appointment cancel kar di gayi hai.';
    if (language === 'ta') return 'Ungal appointment cancel panniyachu.';
    return 'Your appointment has been cancelled.';
  }

  private keepReply(language: PatientMemory['languagePreference']) {
    if (language === 'hi') return 'Theek hai, appointment same rahegi. Dhanyavaad.';
    if (language === 'ta') return 'Seri, appointment same-a irukkum. Nandri.';
    return 'Great, I will keep the appointment as scheduled. Thank you.';
  }

  private politeRejection(language: PatientMemory['languagePreference']) {
    if (language === 'hi') return 'Samajh gaya. Main response log kar raha hoon. Dhanyavaad.';
    if (language === 'ta') return 'Purinjuchu. Ungal response log pannuren. Nandri.';
    return 'Understood. I have logged your response. Thank you.';
  }
}
