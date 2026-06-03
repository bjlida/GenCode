import type { VoiceProviderId } from "./types";

export const VOICE_PROVIDERS: {
  id: VoiceProviderId;
  label: string;
  description: string;
  needsKey: boolean;
}[] = [
  {
    id: "browser",
    label: "浏览器语音识别",
    description: "免费，无需密钥。使用系统/浏览器内置识别（推荐国内用户）。",
    needsKey: false,
  },
  {
    id: "baidu",
    label: "百度语音",
    description: "百度智能云短语音识别，需 API Key 与 Secret Key。",
    needsKey: true,
  },
  {
    id: "openai",
    label: "OpenAI Whisper",
    description: "OpenAI 语音转文字 API。",
    needsKey: true,
  },
  {
    id: "groq",
    label: "Groq Whisper",
    description: "Groq 托管的 Whisper 模型，需 Groq API 密钥。",
    needsKey: true,
  },
];

export const VOICE_LANGUAGES = [
  { id: "zh-CN", label: "简体中文" },
  { id: "zh-TW", label: "繁体中文" },
  { id: "en-US", label: "English (US)" },
  { id: "ja-JP", label: "日本語" },
  { id: "ko-KR", label: "한국어" },
] as const;

export function getVoiceProvider(id: VoiceProviderId) {
  const p = VOICE_PROVIDERS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown voice provider: ${id}`);
  return p;
}
