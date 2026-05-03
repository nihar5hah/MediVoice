import type { Intent, LanguageCode } from '../shared/types.js';
import { doctors } from '../tools/scheduling.js';

export interface ParsedTurn {
  intent: Intent;
  doctorId?: string;
  specialty?: string;
  startIso?: string;
  accepted?: boolean;
  rejected?: boolean;
}

export function parseTurn(utterance: string, language: LanguageCode): ParsedTurn {
  const text = utterance.toLowerCase();
  const doctor = doctors.find((item) => text.includes(item.name.toLowerCase()) || text.includes(item.id.replace('doc-', '')));
  const specialty = ['cardiology', 'dermatology', 'general medicine'].find((item) => text.includes(item));
  const startIso = parseRequestedTime(text);
  const accepted = /\b(yes|confirm|keep|ok|haan|theek|seri|ama)\b/.test(text);
  const rejected = /\b(no|reject|not now|later|nahi|vendam)\b/.test(text);

  let intent: Intent = 'clarify';
  if (/\b(cancel|remove|delete|nahi chahiye|radd|வேண்டாம்)\b/.test(text)) intent = 'cancel';
  else if (/\b(reschedule|change|move|postpone|shift|badal|மாற்ற)\b/.test(text)) intent = 'reschedule';
  else if (/\b(list|show|my appointment|check my|when is|what is my|kab hai|எப்போது)\b/.test(text)) intent = 'list';
  else if (/\b(available|availability|which doctor|who is|what doctor|free|open slot|any doctor)\b/.test(text)) intent = 'check_availability';
  else if (/\b(book|schedule|appointment|doctor|consult|chahiye|வேண்டும்)\b/.test(text)) intent = 'book';
  else if (accepted || rejected) intent = 'campaign_response';

  return { intent, doctorId: doctor?.id, specialty, startIso, accepted, rejected };
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

function parseRequestedTime(text: string): string | undefined {
  const now = new Date();
  const dayOffset = text.includes('tomorrow') || text.includes('kal') || text.includes('நாளை') ? 1 : 0;
  const hourMatch = text.match(/\b(9|10|11|12|1|2|3|4|14|15|16)(?::(00|30))?\s*(am|pm)?\b/);
  if (!hourMatch && dayOffset === 0) return undefined;
  let hour = hourMatch ? Number(hourMatch[1]) : 10;
  const minute = hourMatch?.[2] ? Number(hourMatch[2]) : 0;
  const meridiem = hourMatch?.[3];
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (!meridiem && hour >= 1 && hour <= 4) hour += 12;

  // Build the time in IST: treat the IST wall-clock as UTC offsets
  const nowIST = new Date(now.getTime() + IST_OFFSET_MS);
  const reqIST = new Date(nowIST);
  reqIST.setUTCDate(nowIST.getUTCDate() + dayOffset);
  reqIST.setUTCHours(hour, minute, 0, 0);
  let reqUTC = new Date(reqIST.getTime() - IST_OFFSET_MS);

  // Auto-advance: if no explicit day was given and the time is already past, assume tomorrow
  if (dayOffset === 0 && reqUTC <= now) {
    reqUTC = new Date(reqUTC.getTime() + 24 * 60 * 60 * 1000);
  }

  return reqUTC.toISOString();
}
