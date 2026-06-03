const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

export function mediaRecorderSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

export function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const m of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return undefined;
}

export async function blobToPcm16kMono(blob: Blob): Promise<ArrayBuffer> {
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const mono =
      decoded.numberOfChannels === 1
        ? decoded.getChannelData(0)
        : mixToMono(decoded);
    const pcm = new Int16Array(mono.length);
    for (let i = 0; i < mono.length; i++) {
      const s = Math.max(-1, Math.min(1, mono[i]!));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm.buffer;
  } finally {
    await ctx.close();
  }
}

function mixToMono(buf: AudioBuffer): Float32Array {
  const len = buf.length;
  const out = new Float32Array(len);
  const n = buf.numberOfChannels;
  for (let c = 0; c < n; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) out[i]! += ch[i]! / n;
  }
  return out;
}

export function createMediaRecorder(
  onBlob: (blob: Blob) => void,
  onError: (err: unknown) => void,
): {
  start: () => Promise<void>;
  stop: () => void;
} {
  let rec: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  const chunks: Blob[] = [];

  const teardown = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMime();
      rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks.length = 0;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, {
          type: rec?.mimeType || "audio/webm",
        });
        chunks.length = 0;
        teardown();
        if (blob.size > 0) onBlob(blob);
      };
      rec.onerror = () => onError(new Error("录音失败"));
      rec.start();
    },
    stop() {
      if (rec && rec.state !== "inactive") rec.stop();
      else teardown();
      rec = null;
    },
  };
}
