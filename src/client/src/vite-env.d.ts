/// <reference types="vite/client" />

interface SpeechRecognitionResultLike {
  transcript: string;
}

interface SpeechRecognitionAlternativeListLike {
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionResultListLike {
  [index: number]: SpeechRecognitionAlternativeListLike;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
}
