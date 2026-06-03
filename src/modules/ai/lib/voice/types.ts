export type VoiceProviderId = "browser" | "openai" | "groq" | "baidu";

export type VoiceCredentials = {
  openaiKey: string | null;
  groqKey: string | null;
  baiduApiKey: string | null;
  baiduSecretKey: string | null;
};
