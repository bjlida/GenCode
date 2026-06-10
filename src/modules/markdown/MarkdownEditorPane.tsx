import { cn } from "@/lib/utils";
import {
  EditorPane,
  type EditorCursorPosition,
  type EditorPaneHandle,
} from "@/modules/editor/EditorPane";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { MarkdownPreviewPane } from "./MarkdownPreviewPane";

export type MarkdownViewMode = "preview" | "source";

type Props = {
  path: string;
  viewHint?: MarkdownViewMode;
  viewHintSeq?: number;
  visible: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved?: () => void;
  onClose?: () => void;
  onCursorChange?: (pos: EditorCursorPosition | null) => void;
  onFormat?: () => void;
  onReady?: () => void;
};

function ViewToggle({
  value,
  onChange,
}: {
  value: MarkdownViewMode;
  onChange: (mode: MarkdownViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-border/60 bg-background p-0.5"
      role="group"
      aria-label="Markdown 视图"
    >
      <button
        type="button"
        aria-pressed={value === "preview"}
        onClick={() => onChange("preview")}
        className={cn(
          "rounded px-2 py-0.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
          value === "preview" && "bg-muted text-foreground",
        )}
      >
        预览
      </button>
      <button
        type="button"
        aria-pressed={value === "source"}
        onClick={() => onChange("source")}
        className={cn(
          "rounded px-2 py-0.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
          value === "source" && "bg-muted text-foreground",
        )}
      >
        Markdown
      </button>
    </div>
  );
}

export const MarkdownEditorPane = forwardRef<EditorPaneHandle, Props>(
  function MarkdownEditorPane(
    {
      path,
      viewHint,
      viewHintSeq,
      visible,
      onDirtyChange,
      onSaved,
      onClose,
      onCursorChange,
      onFormat,
      onReady,
    },
    ref,
  ) {
    const editorRef = useRef<EditorPaneHandle>(null);
    const [viewMode, setViewMode] = useState<MarkdownViewMode>(
      viewHint ?? "source",
    );
    const [previewContent, setPreviewContent] = useState<string | null>(null);

    useEffect(() => {
      if (viewHint) setViewMode(viewHint);
    }, [viewHint, viewHintSeq]);

    const syncPreviewContent = useCallback(() => {
      setPreviewContent(editorRef.current?.getContent() ?? null);
    }, []);

    const setMode = useCallback(
      (mode: MarkdownViewMode) => {
        if (mode === "preview") syncPreviewContent();
        setViewMode(mode);
      },
      [syncPreviewContent],
    );

    useImperativeHandle(
      ref,
      (): EditorPaneHandle => ({
        setQuery: (q) => editorRef.current?.setQuery(q),
        setReplaceQuery: (replace) =>
          editorRef.current?.setReplaceQuery(replace),
        replaceNext: () => editorRef.current?.replaceNext(),
        replaceAll: () => editorRef.current?.replaceAll(),
        findNext: () => editorRef.current?.findNext(),
        findPrevious: () => editorRef.current?.findPrevious(),
        clearQuery: () => editorRef.current?.clearQuery(),
        focus: () => editorRef.current?.focus(),
        getSelection: () => editorRef.current?.getSelection() ?? null,
        getSelectionRect: () => editorRef.current?.getSelectionRect() ?? null,
        getPath: () => editorRef.current?.getPath() ?? path,
        getCursorPosition: () =>
          editorRef.current?.getCursorPosition() ?? null,
        reload: () => editorRef.current?.reload() ?? false,
        save: () => editorRef.current?.save() ?? Promise.resolve(false),
        undo: () => editorRef.current?.undo(),
        redo: () => editorRef.current?.redo(),
        getContent: () => editorRef.current?.getContent() ?? null,
      }),
      [path],
    );

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border/30 bg-background">
        <div className="flex h-8 shrink-0 items-center justify-end border-b border-border/30 px-2">
          <ViewToggle value={viewMode} onChange={setMode} />
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            className={cn(
              "absolute inset-0",
              viewMode !== "source" && "invisible pointer-events-none",
            )}
            aria-hidden={viewMode !== "source"}
          >
            <EditorPane
              ref={editorRef}
              path={path}
              onDirtyChange={onDirtyChange}
              onSaved={onSaved}
              onClose={onClose}
              onCursorChange={onCursorChange}
              onFormat={onFormat}
              onReady={
                visible && viewMode === "source" ? onReady : undefined
              }
            />
          </div>
          <div
            className={cn(
              "absolute inset-0",
              viewMode !== "preview" && "invisible pointer-events-none",
            )}
            aria-hidden={viewMode !== "preview"}
          >
            <MarkdownPreviewPane
              path={path}
              content={previewContent}
              visible={visible && viewMode === "preview"}
              embedded
            />
          </div>
        </div>
      </div>
    );
  },
);
