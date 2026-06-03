import { invoke } from "@tauri-apps/api/core";
import { KEYRING_SERVICE } from "../../config";
import { emitKeysChanged } from "@/modules/settings/store";

const BAIDU_API_ACCOUNT = "baidu-speech-api-key";
const BAIDU_SECRET_ACCOUNT = "baidu-speech-secret-key";

async function read(account: string): Promise<string | null> {
  const v = await invoke<string | null>("secrets_get", {
    service: KEYRING_SERVICE,
    account,
  }).catch(() => null);
  return v && v.length > 0 ? v : null;
}

async function write(account: string, value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("密钥不能为空");
  await invoke("secrets_set", {
    service: KEYRING_SERVICE,
    account,
    password: trimmed,
  });
}

async function remove(account: string): Promise<void> {
  try {
    await invoke("secrets_delete", {
      service: KEYRING_SERVICE,
      account,
    });
  } catch {
    /* absent */
  }
}

export async function getBaiduSpeechKeys(): Promise<{
  apiKey: string | null;
  secretKey: string | null;
}> {
  const [apiKey, secretKey] = await Promise.all([
    read(BAIDU_API_ACCOUNT),
    read(BAIDU_SECRET_ACCOUNT),
  ]);
  return { apiKey, secretKey };
}

export async function setBaiduSpeechApiKey(key: string): Promise<void> {
  await write(BAIDU_API_ACCOUNT, key);
  await emitKeysChanged();
}

export async function setBaiduSpeechSecretKey(key: string): Promise<void> {
  await write(BAIDU_SECRET_ACCOUNT, key);
  await emitKeysChanged();
}

export async function clearBaiduSpeechKeys(): Promise<void> {
  await Promise.all([remove(BAIDU_API_ACCOUNT), remove(BAIDU_SECRET_ACCOUNT)]);
  await emitKeysChanged();
}
