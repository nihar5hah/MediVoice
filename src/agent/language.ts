import type { LanguageCode } from '../shared/types.js';

const hindiScript  = /[\u0900-\u097F]/;
const tamilScript  = /[\u0B80-\u0BFF]/;

// Common Romanized Hindi (Hinglish) words that Deepgram transcribes in Latin script
const hindiRoman = /\b(mujhe|chahiye|nahi|haan|subah|shaam|baje|milna|karna|karo|achha|shukriya|namaste|dhanyavaad|boliye|batao|seedha|theek\s*h|bilkul|zaroor|aaj\s+[a-z0-9]|kal\s+[a-z0-9]|doctor\s+se|mere\s|mera\s|aap\s+kya|appointment\s+(chahiye|lena|book|karna)|kya\s+(aap|tum)|main\s+[a-z]|yaar\b|bhai\b|abhi\b|phir\b|bahut\b)\b/i;
// Common Romanized Tamil words
const tamilRoman  = /\b(vanakkam|nandri|romba|eppothu|naale|innikku|mruththuvar|sollunga|mudiyuma|theriyum|aamaa|paathukalam|vendiyathu|naan\b|seri\b|illai\b)\b/i;

export function detectLanguage(text: string, fallback: LanguageCode = 'en'): LanguageCode {
  const lower = text.toLowerCase();
  if (tamilScript.test(text) || tamilRoman.test(lower) || /\btamil\b/.test(lower)) return 'ta';
  if (hindiScript.test(text) || hindiRoman.test(lower) || /\bhindi\b/.test(lower)) return 'hi';
  return fallback; // no explicit markers → stay in the established language
}

export function formatTime(iso: string, language: LanguageCode) {
  return new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(iso));
}

export type SayKey =
  | 'clarify' | 'noActive' | 'listed' | 'campaignIntro'
  | 'confirmBook' | 'confirmCancel' | 'confirmReschedule'
  | 'actionCancelled' | 'noSlot'
  | 'askDoctor' | 'askName' | 'noDoctor' | 'cancelFailed';

export function say(language: LanguageCode, key: SayKey, args?: { doctor?: string; time?: string }) {
  const d = args?.doctor ?? '';
  const t = args?.time ?? '';
  const copy: Record<LanguageCode, Record<SayKey, string>> = {
    en: {
      clarify: 'I can help book, reschedule, or cancel an appointment. What would you like to do?',
      noActive: 'I could not find an active appointment for you.',
      listed: 'Here are your active appointments.',
      campaignIntro: 'This is your care assistant calling with a reminder. Would you like to keep, reschedule, or cancel the appointment?',
      confirmBook: `Shall I book an appointment with ${d} at ${t}? Say yes to confirm or no to choose a different time.`,
      confirmCancel: `Shall I cancel your appointment with ${d} on ${t}? Say yes to confirm or no to keep it.`,
      confirmReschedule: `Shall I reschedule your appointment to ${d} at ${t}? Say yes to confirm or no to choose differently.`,
      actionCancelled: 'No problem, I have not made any changes. How else can I help you?',
      noSlot: 'I could not find an available slot. Please suggest another time or doctor.',
      askDoctor: 'Which doctor would you like to see?',
      askName: 'May I have your full name please?',
      noDoctor: 'I did not catch which doctor you would like. Could you say the doctor\'s name?',
      cancelFailed: 'I am sorry, I could not cancel the appointment. Please try again.'
    },
    hi: {
      clarify: 'Main appointment book, reschedule, ya cancel kar sakta hoon. Aap kaunsa doctor ya time chahenge?',
      noActive: 'Mujhe aapki koi active appointment nahi mili.',
      listed: 'Yeh aapki active appointments hain.',
      campaignIntro: 'Yeh aapka care assistant reminder ke liye call kar raha hai. Kya aap appointment rakhna, reschedule, ya cancel karna chahenge?',
      confirmBook: `Kya main ${d} ke saath ${t} par appointment book karoon? Haan boliye confirm karne ke liye ya nahi boliye alag time ke liye.`,
      confirmCancel: `Kya main aapki ${d} ke saath ${t} wali appointment cancel karoon? Haan boliye confirm karne ke liye ya nahi boliye rakhne ke liye.`,
      confirmReschedule: `Kya main appointment ${d} ke saath ${t} par reschedule karoon? Haan boliye confirm karne ke liye ya nahi boliye alag time ke liye.`,
      actionCancelled: 'Theek hai, maine koi changes nahi kiye. Aur kuch help chahiye?',
      noSlot: 'Koi available slot nahi mila. Kripya alag time ya doctor batayein.',
      askDoctor: 'Aap kaunse doctor se milna chahenge?',
      askName: 'Kripya apna poora naam batayein?',
      noDoctor: 'Doctor ka naam samajh nahi aaya. Kripya doctor ka naam dobara batayein.',
      cancelFailed: 'Khed hai, appointment cancel nahi hui. Kripya dobara try karein.'
    },
    ta: {
      clarify: 'Naan appointment book, reschedule, allathu cancel panna mudiyum. Endha doctor allathu time venum?',
      noActive: 'Ungalukku active appointment kandupidikka mudiyavillai.',
      listed: 'Ungal active appointments inge.',
      campaignIntro: 'Idhu ungal care assistant reminder call. Appointment-ai keep, reschedule, allathu cancel panna virumbugireergala?',
      confirmBook: `${d} kooda ${t} appointment book pannattuma? Aama sollunga confirm panna, illai sollunga vera time theriya.`,
      confirmCancel: `${d} kooda ${t} appointment cancel pannattuma? Aama sollunga confirm panna, illai sollunga vaikkave.`,
      confirmReschedule: `Appointment-ai ${d} kooda ${t} ku reschedule pannattuma? Aama sollunga confirm panna, illai sollunga vera time theriya.`,
      actionCancelled: 'Paravailla, naan enna maathramum seyyalai. Vera enna udhavi seyyattuma?',
      noSlot: 'Available slot kandupidikka mudiyavillai. Vera time allathu doctor sollunga.',
      askDoctor: 'Endha mruththuvarை paarkka virumbukireenga?',
      askName: 'Ungal full name sollunga?',
      noDoctor: 'Doctor peyar puriyavillai. Mruththuvar peyar solla mudiuma?',
      cancelFailed: 'Manikkinren, appointment cancel aagavillai. Meendum try pannunga.'
    }
  };
  return copy[language][key];
}
