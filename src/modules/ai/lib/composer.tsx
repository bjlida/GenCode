import { invoke } from "@tauri-apps/api/core";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useVoiceRecording } from "../hooks/useVoiceRecording";
import { VoicePermissionDialog } from "../components/VoicePermissionDialog";
import { expandSnippetTokens, type Snippet } from "../lib/snippets";
import { tryRunSlashCommand, type SlashCommandMeta } from "./slashCommands";
import { getModel, modelSupportsVision } from "../config";
import { getOrCreateChat, useChatStore } from "../store/chatStore";
import { useSnippetsStore } from "../store/snippetsStore";
import { currentWorkspaceEnv } from "@/modules/workspace";
import {
  attachmentId,
  blobToDataUrl,
  captureDisplayScreenshot,
  clipboardImageFiles,
  isImagePath,
  MAX_IMAGE_BYTES,
  screenshotName,
} from "./attachments";

export type FileAttachment = {
  id: string;
  name: string;
  kind: "image" | "text" | "selection";
  mediaType: string;
  url?: string;
  text?: string;
  size: number;
  /** For kind === "selection": which surface it came from. */
  source?: "terminal" | "editor";
};

type MessagePart =
  | { type: "text"; text: string }
  | { type: "file"; mediaType: string; url: string; filename?: string };

export const MAX_TEXT_INLINE = 200_000;
export const ACCEPTED_FILES =
  "image/*,.txt,.md,.json,.yaml,.yml,.toml,.sh,.zsh,.bash,.py,.js,.jsx,.ts,.tsx,.rs,.go,.java,.c,.cpp,.h,.hpp,.html,.css,.csv,.log,.env,.config,.conf,.ini,Dockerfile,.dockerfile";

type Voice = ReturnType<typeof useVoiceRecording>;

type ComposerCtx = {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  files: FileAttachment[];
  addFiles: (list: FileList | null) => Promise<void>;
  addFilesFromDataTransfer: (data: DataTransfer) => Promise<boolean>;
  addImageBlob: (blob: Blob, name: string, mediaType?: string) => Promise<void>;
  pasteFromClipboard: () => Promise<boolean>;
  captureScreenshot: () => Promise<boolean>;
  /** Attach a file by absolute path — used by the file explorer's "Attach to Agent". */
  attachFileByPath: (path: string) => Promise<void>;
  removeFile: (id: string) => void;
  pickedSnippets: Snippet[];
  addSnippet: (s: Snippet) => void;
  removeSnippet: (id: string) => void;
  pickedCommands: SlashCommandMeta[];
  addCommand: (c: SlashCommandMeta) => void;
  removeCommand: (name: string) => void;
  isBusy: boolean;
  submit: () => void;
  stop: () => void;
  voice: Voice;
  canSend: boolean;
};

const Ctx = createContext<ComposerCtx | null>(null);

export function useComposer(): ComposerCtx {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useComposer must be used inside <AiComposerProvider>");
  return ctx;
}

type ProviderProps = {
  children: React.ReactNode;
};

export function AiComposerProvider({ children }: ProviderProps) {
  const sessionId = useChatStore((s) => s.activeSessionId);
  const status = useChatStore((s) => s.agentMeta.status);
  const isBusy = status === "thinking" || status === "streaming";

  const [value, setValue] = useState("");
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [pickedSnippets, setPickedSnippets] = useState<Snippet[]>([]);
  const [pickedCommands, setPickedCommands] = useState<SlashCommandMeta[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const focusSignal = useChatStore((s) => s.focusSignal);
  const pendingPrefill = useChatStore((s) => s.pendingPrefill);
  const consumePrefill = useChatStore((s) => s.consumePrefill);
  const pendingSelections = useChatStore((s) => s.pendingSelections);
  const consumeSelections = useChatStore((s) => s.consumeSelections);

  useEffect(() => {
    if (focusSignal === 0) return;
    textareaRef.current?.focus();
    if (pendingPrefill != null) {
      const text = consumePrefill();
      if (text) setValue((v) => (v ? `${text}${v}` : text));
    }
  }, [focusSignal, pendingPrefill, consumePrefill]);

  // Re-focus the textarea whenever the agent finishes a response
  const prevIsBusyRef = useRef(false);
  useEffect(() => {
    if (prevIsBusyRef.current && !isBusy) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
    prevIsBusyRef.current = isBusy;
  }, [isBusy, textareaRef]);

  // Listen for explorer's "Attach to Agent" event.
  useEffect(() => {
    const onAttach = (e: Event) => {
      const path = (e as CustomEvent<string>).detail;
      if (typeof path === "string" && path.length > 0) {
        void attachFileByPath(path);
      }
    };
    window.addEventListener("gencode:ai-attach-file", onAttach);
    return () => window.removeEventListener("gencode:ai-attach-file", onAttach);
    // attachFileByPath is stable for our purposes (closes over setFiles only)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pendingSelections.length === 0) return;
    const drained = consumeSelections();
    if (drained.length === 0) return;
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.id));
      const next: FileAttachment[] = [];
      for (const sel of drained) {
        if (existing.has(sel.id)) continue;
        next.push({
          id: sel.id,
          name:
            sel.source === "editor"
              ? "编辑器选中"
              : "终端选中",
          kind: "selection",
          mediaType: "text/plain",
          text: sel.text,
          size: sel.text.length,
          source: sel.source,
        });
      }
      return next.length ? [...prev, ...next] : prev;
    });
  }, [pendingSelections, consumeSelections]);

  const voice = useVoiceRecording({
    onRecordingStart: () => valueRef.current,
    onLiveUpdate: (fullText) => {
      setValue(fullText);
    },
    onResult: (transcript) => {
      setValue(transcript);
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
  });

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const next: FileAttachment[] = [];
    for (const f of Array.from(list)) {
      const att = await readAttachment(f);
      if (att) next.push(att);
    }
    if (next.length) {
      setFiles((prev) => [...prev, ...next]);
      useChatStore.getState().focusInput();
    }
  };

  const addFilesFromDataTransfer = async (
    data: DataTransfer,
  ): Promise<boolean> => {
    const images = clipboardImageFiles(data);
    if (images.length > 0) {
      for (const file of images) {
        await addImageBlob(file, file.name || screenshotName(), file.type);
      }
      return true;
    }
    if (data.files.length > 0) {
      await addFiles(data.files);
      return true;
    }
    return false;
  };

  const addImageBlob = async (
    blob: Blob,
    name: string,
    mediaType = "image/png",
  ) => {
    if (blob.size > MAX_IMAGE_BYTES) {
      toast.error("图片过大", {
        description: `上限 ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB。`,
      });
      return;
    }
    const url = await blobToDataUrl(blob);
    const att: FileAttachment = {
      id: attachmentId(name, blob.size),
      name,
      kind: "image",
      mediaType: blob.type || mediaType,
      url,
      size: blob.size,
    };
    setFiles((prev) => [...prev, att]);
    useChatStore.getState().focusInput();
  };

  const pasteFromClipboard = async (): Promise<boolean> => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (!type.startsWith("image/")) continue;
            const blob = await item.getType(type);
            await addImageBlob(blob, screenshotName(), type);
            return true;
          }
        }
      }
    } catch {
      // Fall through to legacy path below.
    }
    toast.message("剪贴板中没有图片", {
      description: "请先截图（如 Win+Shift+S）或使用「截取屏幕」。",
    });
    return false;
  };

  const captureScreenshot = async (): Promise<boolean> => {
    try {
      const shot = await captureDisplayScreenshot();
      if (!shot) {
        toast.error("无法截取屏幕", {
          description: "当前环境不支持屏幕捕获。",
        });
        return false;
      }
      await addImageBlob(shot.blob, shot.name);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/abort|cancel/i.test(msg)) return false;
      toast.error("截图失败", { description: msg });
      return false;
    }
  };

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const addSnippet = (s: Snippet) =>
    setPickedSnippets((prev) =>
      prev.some((p) => p.id === s.id) ? prev : [...prev, s],
    );
  const removeSnippet = (id: string) =>
    setPickedSnippets((prev) => prev.filter((s) => s.id !== id));

  const addCommand = (cmd: SlashCommandMeta) =>
    setPickedCommands((prev) =>
      prev.some((p) => p.name === cmd.name) ? prev : [...prev, cmd],
    );
  const removeCommand = (name: string) =>
    setPickedCommands((prev) => prev.filter((c) => c.name !== name));

  const attachFileByPath = async (path: string) => {
    try {
      if (isImagePath(path)) {
        type DataUrlResult = {
          data_url: string;
          media_type: string;
          size: number;
        };
        const result = await invoke<DataUrlResult>("fs_read_file_data_url", {
          path,
          workspace: currentWorkspaceEnv(),
        });
        const name = path.split(/[\\/]/).pop() || path;
        const id = `path-${path}`;
        setFiles((prev) => {
          if (prev.some((f) => f.id === id)) return prev;
          const att: FileAttachment = {
            id,
            name,
            kind: "image",
            mediaType: result.media_type,
            url: result.data_url,
            size: result.size,
          };
          return [...prev, att];
        });
        useChatStore.getState().focusInput();
        return;
      }

      type ReadResult =
        | { kind: "text"; content: string; size: number }
        | { kind: "binary"; size: number }
        | { kind: "toolarge"; size: number; limit: number };
      const result = await invoke<ReadResult>("fs_read_file", {
        path,
        workspace: currentWorkspaceEnv(),
      });
      if (result.kind !== "text") {
        toast.error("无法附加此文件", {
          description:
            result.kind === "binary"
              ? "二进制文件请改用图片格式，或通过「附加文件」上传。"
              : `文件超过 ${Math.round(result.limit / (1024 * 1024))} MB 上限。`,
        });
        return;
      }
      const name = path.split("/").pop() || path;
      const id = `path-${path}`;
      setFiles((prev) => {
        if (prev.some((f) => f.id === id)) return prev;
        const att: FileAttachment = {
          id,
          name,
          kind: "text",
          mediaType: "text/plain",
          text: result.content,
          size: result.size,
        };
        return [...prev, att];
      });
      // Open the AI panel & focus the input so the user sees the chip.
      useChatStore.getState().focusInput();
    } catch (e) {
      toast.error("附加文件失败", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const submit = () => {
    if (isBusy) return;
    const trimmed = value.trim();
    if (
      !trimmed &&
      files.length === 0 &&
      pickedSnippets.length === 0 &&
      pickedCommands.length === 0
    )
      return;

    // Slash-command interception. `/plan` toggles plan mode; `/init` rewrites
    // the prompt to the GENCODE.md scan template before sending.
    let effectiveText = trimmed;
    let commandMarker: string | null = null;
    let commandSource = trimmed;
    if (pickedCommands.length > 0 && !trimmed.startsWith("/") && !trimmed.startsWith("#")) {
      commandSource = `#${pickedCommands[0].name} ${trimmed}`.trim();
    }
    if (commandSource.startsWith("/") || commandSource.startsWith("#")) {
      const outcome = tryRunSlashCommand(commandSource);
      if (outcome.kind === "handled") {
        if (!outcome.preserveInput) {
          setValue("");
          setPickedCommands([]);
        }
        if (outcome.toast) toast.message(outcome.toast);
        return;
      }
      if (outcome.kind === "send-prompt") {
        effectiveText = outcome.prompt;
        if (outcome.commandName) {
          commandMarker = `<gencode-command name="${outcome.commandName}" />`;
        }
      }
    }

    const parts: MessagePart[] = [];
    const fileBlocks = files
      .filter((f) => f.kind === "text")
      .map(
        (f) =>
          `<file name="${f.name}" mediaType="${f.mediaType}">\n${f.text ?? ""}\n</file>`,
      );
    const selectionBlocks = files
      .filter((f) => f.kind === "selection")
      .map(
        (f) =>
          `<selection source="${f.source ?? "terminal"}">\n${f.text ?? ""}\n</selection>`,
      );
    const { body: bodyAfterTokens, blocks: snippetBlocks } = expandSnippetTokens(
      effectiveText,
      useSnippetsStore.getState().snippets,
    );
    const seenHandles = new Set<string>();
    const allSnippetBlocks: string[] = [];
    for (const s of pickedSnippets) {
      if (seenHandles.has(s.handle)) continue;
      seenHandles.add(s.handle);
      allSnippetBlocks.push(
        `<snippet name="${s.handle}">\n${s.content}\n</snippet>`,
      );
    }
    for (const block of snippetBlocks) {
      const m = block.match(/^<snippet name="([^"]+)"/);
      if (m && seenHandles.has(m[1])) continue;
      if (m) seenHandles.add(m[1]);
      allSnippetBlocks.push(block);
    }
    const composed = [
      commandMarker ?? "",
      allSnippetBlocks.join("\n\n"),
      selectionBlocks.join("\n\n"),
      fileBlocks.join("\n\n"),
      bodyAfterTokens,
    ]
      .filter(Boolean)
      .join("\n\n");
    if (composed) parts.push({ type: "text", text: composed });

    for (const f of files) {
      if (f.kind === "image" && f.url) {
        parts.push({
          type: "file",
          mediaType: f.mediaType,
          url: f.url,
          filename: f.name,
        });
      }
    }

    const hasImages = parts.some(
      (p) => p.type === "file" && p.mediaType.startsWith("image/"),
    );
    if (hasImages) {
      const store = useChatStore.getState();
      const modelId = store.selectedModelId;
      if (!modelSupportsVision(modelId)) {
        const model = getModel(modelId);
        store.patchAgentMeta({
          attachmentNotice: `当前模型「${model.label}」不支持图片输入。请切换到带「视觉」能力的模型，或移除图片附件后再发送。`,
        });
        if (!store.panelOpen) store.openPanel();
        return;
      }
    }

    if (!sessionId) return;
    const chat = getOrCreateChat(sessionId);
    void chat.sendMessage({ role: "user", parts } as Parameters<
      typeof chat.sendMessage
    >[0]);
    const store = useChatStore.getState();
    store.patchAgentMeta({
      hitStepCap: false,
      compactionNotice: null,
      attachmentNotice: null,
    });
    if (!store.panelOpen) store.openPanel();
    setValue("");
    setFiles([]);
    setPickedSnippets([]);
    setPickedCommands([]);
    // Re-focus immediately after submit so the user can type a follow-up
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const stop = () => {
    if (!sessionId) return;
    void getOrCreateChat(sessionId).stop();
  };

  const canSend =
    !isBusy &&
    (value.trim().length > 0 ||
      files.length > 0 ||
      pickedSnippets.length > 0 ||
      pickedCommands.length > 0);

  const ctx: ComposerCtx = {
    textareaRef,
    value,
    setValue,
    files,
    addFiles,
    addFilesFromDataTransfer,
    addImageBlob,
    pasteFromClipboard,
    captureScreenshot,
    attachFileByPath,
    removeFile,
    pickedSnippets,
    addSnippet,
    removeSnippet,
    pickedCommands,
    addCommand,
    removeCommand,
    isBusy,
    submit,
    stop,
    voice,
    canSend,
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <VoicePermissionDialog
        open={voice.permissionDialogOpen}
        denied={voice.permissionDenied}
        requesting={voice.permissionRequesting}
        onConfirm={() => void voice.confirmPermission()}
        onCancel={voice.dismissPermission}
      />
    </Ctx.Provider>
  );
}

async function readAttachment(file: File): Promise<FileAttachment | null> {
  const id = attachmentId(file.name, file.size, file.lastModified);
  if (file.type.startsWith("image/")) {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("图片过大", { description: file.name });
      return null;
    }
    const url = await blobToDataUrl(file);
    return {
      id,
      name: file.name,
      kind: "image",
      mediaType: file.type || "image/png",
      url,
      size: file.size,
    };
  }
  if (file.size > MAX_TEXT_INLINE) {
    toast.error("文件过大", { description: file.name });
    return null;
  }
  const text = await file.text();
  return {
    id,
    name: file.name,
    kind: "text",
    mediaType: file.type || "text/plain",
    text,
    size: file.size,
  };
}
