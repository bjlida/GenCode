import { createOpenAI } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";
import type { VoiceCredentials, VoiceProviderId } from "./types";
import { blobToPcm16kMono } from "./providers/blob";

async function transcribeOpenAi(blob: Blob, apiKey: string): Promise<string> {
  const openai = createOpenAI({ apiKey });
  const buf = new Uint8Array(await blob.arrayBuffer());
  const { text } = await transcribe({
    model: openai.transcription("whisper-1"),
    audio: buf,
  });
  return text;
}

async function transcribeGroq(blob: Blob, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "audio.webm");
  form.append("model", "whisper-large-v3-turbo");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq 转录失败 (${res.status})${body ? `: ${body}` : ""}`);
  }
  const json = (await res.json()) as { text?: string };
  return json.text ?? "";
}

let baiduTokenCache: { token: string; expiresAt: number } | null = null;

async function baiduAccessToken(
  apiKey: string,
  secretKey: string,
): Promise<string> {
  const now = Date.now();
  if (baiduTokenCache && baiduTokenCache.expiresAt > now + 60_000) {
    return baiduTokenCache.token;
  }
  const url = new URL("https://aip.baidubce.com/oauth/2.0/token");
  url.searchParams.set("grant_type", "client_credentials");
  url.searchParams.set("client_id", apiKey);
  url.searchParams.set("client_secret", secretKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`百度 Token 获取失败 (${res.status})`);
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!json.access_token) {
    throw new Error(json.error_description ?? "百度 Token 获取失败");
  }
  baiduTokenCache = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 2592000) * 1000,
  };
  return json.access_token;
}

async function transcribeBaidu(
  blob: Blob,
  apiKey: string,
  secretKey: string,
  lang: string,
): Promise<string> {
  const pcm = await blobToPcm16kMono(blob);
  const token = await baiduAccessToken(apiKey, secretKey);
  const devPid = lang.startsWith("en") ? 1737 : 1537;
  const res = await fetch("https://vop.baidu.com/server_api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      format: "pcm",
      rate: 16000,
      channel: 1,
      cuid: "gencode",
      token,
      dev_pid: devPid,
      speech: bytesToBase64(new Uint8Array(pcm)),
      len: pcm.byteLength,
    }),
  });
  if (!res.ok) throw new Error(`百度语音识别失败 (${res.status})`);
  const json = (await res.json()) as {
    err_no?: number;
    err_msg?: string;
    result?: string[];
  };
  if (json.err_no !== 0) {
    throw new Error(json.err_msg ?? `百度语音识别错误 (${json.err_no})`);
  }
  return (json.result ?? []).join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function transcribeAudio(
  provider: VoiceProviderId,
  blob: Blob,
  creds: VoiceCredentials,
  lang: string,
): Promise<string> {
  switch (provider) {
    case "openai": {
      if (!creds.openaiKey) throw new Error("未配置 OpenAI 密钥");
      return transcribeOpenAi(blob, creds.openaiKey);
    }
    case "groq": {
      if (!creds.groqKey) throw new Error("未配置 Groq 密钥");
      return transcribeGroq(blob, creds.groqKey);
    }
    case "baidu": {
      if (!creds.baiduApiKey || !creds.baiduSecretKey) {
        throw new Error("未配置百度语音 API Key / Secret Key");
      }
      return transcribeBaidu(blob, creds.baiduApiKey, creds.baiduSecretKey, lang);
    }
    default:
      throw new Error("该引擎不使用音频转录");
  }
}
