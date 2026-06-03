import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  setVoiceEnabled,
  setVoiceLanguage,
  setVoiceProvider,
} from "@/modules/settings/store";
import {
  clearBaiduSpeechKeys,
  getBaiduSpeechKeys,
  setBaiduSpeechApiKey,
  setBaiduSpeechSecretKey,
} from "@/modules/ai/lib/voice/keyring";
import {
  VOICE_LANGUAGES,
  VOICE_PROVIDERS,
} from "@/modules/ai/lib/voice/config";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { SettingRow } from "../components/SettingRow";

export function VoiceInputSection() {
  const voiceEnabled = usePreferencesStore((s) => s.voiceEnabled);
  const voiceProvider = usePreferencesStore((s) => s.voiceProvider);
  const voiceLanguage = usePreferencesStore((s) => s.voiceLanguage);
  const [baiduApiKey, setBaiduApiKey] = useState("");
  const [baiduSecretKey, setBaiduSecretKey] = useState("");
  const [baiduConfigured, setBaiduConfigured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getBaiduSpeechKeys().then(({ apiKey, secretKey }) => {
      setBaiduConfigured(!!apiKey && !!secretKey);
      setBaiduApiKey(apiKey ? "••••••••" : "");
      setBaiduSecretKey(secretKey ? "••••••••" : "");
    });
  }, []);

  const providerMeta = VOICE_PROVIDERS.find((p) => p.id === voiceProvider);

  const saveBaiduKeys = async () => {
    setSaving(true);
    try {
      const api =
        baiduApiKey && !baiduApiKey.startsWith("•") ? baiduApiKey : null;
      const secret =
        baiduSecretKey && !baiduSecretKey.startsWith("•")
          ? baiduSecretKey
          : null;
      if (api) await setBaiduSpeechApiKey(api);
      if (secret) await setBaiduSpeechSecretKey(secret);
      if (api || secret) {
        const keys = await getBaiduSpeechKeys();
        setBaiduConfigured(!!keys.apiKey && !!keys.secretKey);
        setBaiduApiKey(keys.apiKey ? "••••••••" : "");
        setBaiduSecretKey(keys.secretKey ? "••••••••" : "");
      }
    } finally {
      setSaving(false);
    }
  };

  const clearBaidu = async () => {
    await clearBaiduSpeechKeys();
    setBaiduApiKey("");
    setBaiduSecretKey("");
    setBaiduConfigured(false);
  };

  return (
    <>
      <SettingRow
        title="启用语音输入"
        description="在 AI 输入框显示麦克风按钮，支持语音转文字。"
      >
        <Switch
          checked={voiceEnabled}
          onCheckedChange={(v) => void setVoiceEnabled(v)}
        />
      </SettingRow>

      <SettingRow
        title="语音引擎"
        description={providerMeta?.description ?? "选择语音转文字服务。"}
      >
        <Select
          value={voiceProvider}
          disabled={!voiceEnabled}
          onValueChange={(v) =>
            void setVoiceProvider(v as typeof voiceProvider)
          }
        >
          <SelectTrigger size="sm" className="h-8 w-44 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICE_PROVIDERS.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-[12px]">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow title="识别语言" description="语音识别的目标语言。">
        <Select
          value={voiceLanguage}
          disabled={!voiceEnabled}
          onValueChange={(v) => void setVoiceLanguage(v)}
        >
          <SelectTrigger size="sm" className="h-8 w-44 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICE_LANGUAGES.map((l) => (
              <SelectItem key={l.id} value={l.id} className="text-[12px]">
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      {voiceProvider === "baidu" ? (
        <div className="mb-3 flex flex-col gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
          <p className="text-[11px] text-muted-foreground">
            在{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() =>
                void openUrl(
                  "https://console.bce.baidu.com/ai-engine/speech/overview/index",
                )
              }
            >
              百度智能云 · 语音技术
            </button>{" "}
            创建应用，获取 API Key 与 Secret Key。密钥存储在系统密钥链中。
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="password"
              value={baiduApiKey}
              placeholder="API Key"
              onChange={(e) => setBaiduApiKey(e.target.value)}
              className="h-8 text-[12px]"
            />
            <Input
              type="password"
              value={baiduSecretKey}
              placeholder="Secret Key"
              onChange={(e) => setBaiduSecretKey(e.target.value)}
              className="h-8 text-[12px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              disabled={saving}
              onClick={() => void saveBaiduKeys()}
            >
              {baiduConfigured ? "更新密钥" : "保存密钥"}
            </Button>
            {baiduConfigured ? (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => void clearBaidu()}
              >
                清除
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {voiceProvider === "openai" || voiceProvider === "groq" ? (
        <p className="mb-3 text-[11px] text-muted-foreground">
          {voiceProvider === "openai"
            ? "OpenAI 密钥在「模型」页配置。"
            : "Groq 密钥在「模型」页配置。"}
        </p>
      ) : null}
    </>
  );
}
