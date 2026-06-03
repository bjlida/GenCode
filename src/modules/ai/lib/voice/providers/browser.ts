type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: {
    resultIndex: number;
    results: { length: number; [i: number]: { isFinal: boolean; 0?: { transcript: string } } | undefined };
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function browserVoiceSupported(): boolean {
  return getSpeechRecognition() != null;
}

export function createBrowserRecognizer(lang: string): {
  start: (onUpdate: (text: string) => void, onEnd: () => void) => void;
  stop: () => void;
} {
  const Ctor = getSpeechRecognition();
  if (!Ctor) throw new Error("浏览器不支持语音识别");
  let rec: BrowserSpeechRecognition | null = null;
  let userStopped = false;
  let finalTranscript = "";

  const bind = (onUpdate: (text: string) => void, onEnd: () => void) => {
    rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const item = e.results[i];
        const chunk = item?.[0]?.transcript ?? "";
        if (item?.isFinal) finalTranscript += chunk;
        else interim += chunk;
      }
      const full = (finalTranscript + interim).trim();
      if (full) onUpdate(full);
    };
    rec.onerror = () => {
      if (!userStopped) onEnd();
    };
    rec.onend = () => {
      if (userStopped) {
        onEnd();
        return;
      }
      // Chrome stops after silence; restart until the user clicks stop.
      bind(onUpdate, onEnd);
    };
    rec.start();
  };

  return {
    start(onUpdate, onEnd) {
      userStopped = false;
      finalTranscript = "";
      bind(onUpdate, onEnd);
    },
    stop() {
      userStopped = true;
      rec?.stop();
      rec = null;
    },
  };
}
