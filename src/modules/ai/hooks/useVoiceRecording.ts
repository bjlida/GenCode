import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { onKeysChanged } from "@/modules/settings/store";
import { useChatStore } from "../store/chatStore";
import { getVoiceProvider } from "../lib/voice/config";
import { getBaiduSpeechKeys } from "../lib/voice/keyring";
import {
  queryMicPermission,
  requestMicPermission,
  watchMicPermission,
  type MicPermissionState,
} from "../lib/voice/permission";
import {
  browserVoiceSupported,
  createBrowserRecognizer,
} from "../lib/voice/providers/browser";
import {
  createMediaRecorder,
  mediaRecorderSupported,
} from "../lib/voice/providers/blob";
import { transcribeAudio } from "../lib/voice/transcribe";
import type { VoiceCredentials, VoiceProviderId } from "../lib/voice/types";

type State = "idle" | "recording" | "transcribing";

function mergeVoiceText(base: string, spoken: string): string {
  const b = base.trimEnd();
  const s = spoken.trim();
  if (!s) return b;
  return b ? `${b} ${s}` : s;
}

export function useVoiceRecording({
  onResult,
  onLiveUpdate,
  onRecordingStart,
}: {
  onResult: (text: string) => void;
  onLiveUpdate?: (fullText: string) => void;
  onRecordingStart?: () => string;
}) {
  const provider = usePreferencesStore((s) => s.voiceProvider);
  const lang = usePreferencesStore((s) => s.voiceLanguage);
  const voiceEnabled = usePreferencesStore((s) => s.voiceEnabled);
  const openaiKey = useChatStore((s) => s.apiKeys.openai);
  const groqKey = useChatStore((s) => s.apiKeys.groq);
  const [baiduKeys, setBaiduKeys] = useState<{
    apiKey: string | null;
    secretKey: string | null;
  }>({ apiKey: null, secretKey: null });
  const [state, setState] = useState<State>("idle");
  const [micPermission, setMicPermission] =
    useState<MicPermissionState>("prompt");
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [permissionRequesting, setPermissionRequesting] = useState(false);
  const browserRef = useRef<ReturnType<typeof createBrowserRecognizer> | null>(
    null,
  );
  const blobRef = useRef<ReturnType<typeof createMediaRecorder> | null>(null);
  const prefixRef = useRef("");
  const [liveTranscript, setLiveTranscript] = useState("");

  useEffect(() => {
    let alive = true;
    let unlisten: (() => void) | null = null;
    const load = () => {
      void getBaiduSpeechKeys().then((keys) => {
        if (alive) setBaiduKeys(keys);
      });
    };
    load();
    void onKeysChanged(load).then((fn) => {
      unlisten = fn;
    });
    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    void queryMicPermission().then(setMicPermission);
    return watchMicPermission(setMicPermission);
  }, []);

  const creds = useMemo<VoiceCredentials>(
    () => ({
      openaiKey,
      groqKey,
      baiduApiKey: baiduKeys.apiKey,
      baiduSecretKey: baiduKeys.secretKey,
    }),
    [openaiKey, groqKey, baiduKeys.apiKey, baiduKeys.secretKey],
  );

  const supported = useMemo(() => {
    if (provider === "browser") return browserVoiceSupported();
    return mediaRecorderSupported();
  }, [provider]);

  const ready = useMemo(() => {
    if (!supported) return false;
    switch (provider) {
      case "browser":
        return true;
      case "openai":
        return !!creds.openaiKey;
      case "groq":
        return !!creds.groqKey;
      case "baidu":
        return !!creds.baiduApiKey && !!creds.baiduSecretKey;
      default:
        return false;
    }
  }, [supported, provider, creds]);

  const unavailableReason = useMemo(() => {
    if (!supported) return "当前环境不支持语音输入";
    if (ready) return null;
    const meta = getVoiceProvider(provider);
    switch (provider) {
      case "openai":
        return "请在设置中配置 OpenAI 密钥";
      case "groq":
        return "请在设置中配置 Groq 密钥";
      case "baidu":
        return "请在设置 → 通用 → 语音输入中配置百度 API Key 与 Secret Key";
      default:
        return meta.needsKey ? "请先完成语音引擎配置" : null;
    }
  }, [supported, ready, provider]);

  const stop = useCallback(() => {
    browserRef.current?.stop();
    browserRef.current = null;
    blobRef.current?.stop();
    blobRef.current = null;
    setLiveTranscript("");
    prefixRef.current = "";
  }, []);

  const pushLive = useCallback(
    (spoken: string) => {
      setLiveTranscript(spoken);
      onLiveUpdate?.(mergeVoiceText(prefixRef.current, spoken));
    },
    [onLiveUpdate],
  );

  const doStart = useCallback(async () => {
    if (!ready || state !== "idle") return;
    prefixRef.current = onRecordingStart?.() ?? "";
    setLiveTranscript("");

    if (provider === "browser") {
      try {
        const rec = createBrowserRecognizer(lang);
        browserRef.current = rec;
        setState("recording");
        rec.start(
          (text) => pushLive(text),
          () => {
            browserRef.current = null;
            setState("idle");
            setLiveTranscript("");
            prefixRef.current = "";
          },
        );
      } catch (e) {
        console.error("voice.browser", e);
        setState("idle");
        prefixRef.current = "";
        setLiveTranscript("");
      }
      return;
    }

    try {
      const rec = createMediaRecorder(
        (blob) => {
          setState("transcribing");
          void transcribeAudio(provider, blob, creds, lang)
            .then((text) => {
              if (text.trim()) {
                onResult(mergeVoiceText(prefixRef.current, text.trim()));
              }
            })
            .catch((e) => console.error("voice.transcribe", e))
            .finally(() => {
              setState("idle");
              prefixRef.current = "";
            });
        },
        (e) => {
          console.error("voice.record", e);
          setState("idle");
        },
      );
      blobRef.current = rec;
      await rec.start();
      setState("recording");
    } catch (e) {
      console.error("voice.getUserMedia", e);
      blobRef.current = null;
      setState("idle");
      prefixRef.current = "";
    }
  }, [ready, state, provider, lang, creds, onResult, onRecordingStart, pushLive]);

  const confirmPermission = useCallback(async () => {
    setPermissionRequesting(true);
    try {
      const ok = await requestMicPermission();
      const next = await queryMicPermission();
      setMicPermission(next);
      setPermissionDialogOpen(false);
      if (ok || next === "granted") {
        await doStart();
        return;
      }
      toast.error("无法访问麦克风", {
        description: "请在系统或浏览器设置中允许麦克风权限。",
      });
    } finally {
      setPermissionRequesting(false);
    }
  }, [doStart]);

  const dismissPermission = useCallback(() => {
    if (!permissionRequesting) setPermissionDialogOpen(false);
  }, [permissionRequesting]);

  const requestStart = useCallback(async () => {
    if (!voiceEnabled || !ready || state !== "idle") return;
    const perm = micPermission === "unsupported" ? await queryMicPermission() : micPermission;
    if (perm === "unsupported") {
      toast.error("当前环境不支持麦克风");
      return;
    }
    if (perm === "granted") {
      await doStart();
      return;
    }
    if (perm === "denied") {
      setPermissionDialogOpen(true);
      return;
    }
    setPermissionDialogOpen(true);
  }, [voiceEnabled, ready, state, micPermission, doStart]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    state,
    recording: state === "recording",
    transcribing: state === "transcribing",
    liveTranscript,
    /** @deprecated use `requestStart` */
    start: requestStart,
    requestStart,
    stop,
    supported: supported && voiceEnabled,
    ready: ready && voiceEnabled,
    /** @deprecated use `ready` */
    hasKey: ready && voiceEnabled,
    unavailableReason: !voiceEnabled
      ? "语音输入已在设置中关闭"
      : unavailableReason,
    provider,
    voiceEnabled,
    permissionDialogOpen,
    permissionDenied: micPermission === "denied",
    permissionRequesting,
    confirmPermission,
    dismissPermission,
  };
}

/** @deprecated use useVoiceRecording */
export const useWhisperRecording = useVoiceRecording;

export type { VoiceProviderId };
