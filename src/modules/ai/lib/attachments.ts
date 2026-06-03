export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "ico",
]);

export function isImagePath(path: string): boolean {
  const base = path.split(/[\\/]/).pop() ?? path;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return false;
  return IMAGE_EXT.has(base.slice(dot + 1).toLowerCase());
}

export function attachmentId(name: string, size: number, stamp = Date.now()): string {
  return `${name}-${size}-${stamp}`;
}

export function screenshotName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `截图-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return readAsDataURL(blob);
}

export async function captureDisplayScreenshot(): Promise<{
  blob: Blob;
  name: string;
} | null> {
  if (!navigator.mediaDevices?.getDisplayMedia) return null;
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "monitor" } as MediaTrackConstraints,
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    if (!track) return null;

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) return null;
    return { blob, name: screenshotName() };
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

export function clipboardImageFiles(data: DataTransfer): File[] {
  const out: File[] = [];
  if (data.items?.length) {
    for (const item of Array.from(data.items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) out.push(file);
      }
    }
  }
  if (out.length === 0 && data.files?.length) {
    for (const file of Array.from(data.files)) {
      if (file.type.startsWith("image/")) out.push(file);
    }
  }
  return out;
}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
