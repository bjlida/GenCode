export type MicPermissionState = "granted" | "denied" | "prompt" | "unsupported";

export function micSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export async function queryMicPermission(): Promise<MicPermissionState> {
  if (!micSupported()) return "unsupported";
  if (!navigator.permissions?.query) return "prompt";
  try {
    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return result.state as MicPermissionState;
  } catch {
    return "prompt";
  }
}

export async function requestMicPermission(): Promise<boolean> {
  if (!micSupported()) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export function watchMicPermission(
  cb: (state: MicPermissionState) => void,
): () => void {
  if (!navigator.permissions?.query) return () => {};
  let disposed = false;
  let result: PermissionStatus | null = null;
  void navigator.permissions
    .query({ name: "microphone" as PermissionName })
    .then((r) => {
      if (disposed) return;
      result = r;
      cb(r.state as MicPermissionState);
      r.onchange = () => cb(r.state as MicPermissionState);
    })
    .catch(() => {});
  return () => {
    disposed = true;
    if (result) result.onchange = null;
  };
}
