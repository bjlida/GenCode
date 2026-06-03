import { cn } from "@/lib/utils";
import { MarkdownEditorPane } from "@/modules/markdown/MarkdownEditorPane";
import { isMarkdownPath } from "@/modules/markdown/lib/isMarkdownPath";
import type { EditorTab, Tab } from "@/modules/tabs";
import { useEffect, useRef } from "react";
import { EditorPane, type EditorCursorPosition, type EditorPaneHandle } from "./EditorPane";

type Props = {
  tabs: Tab[];
  activeId: number;
  onDirtyChange: (id: number, dirty: boolean) => void;
  registerHandle: (id: number, handle: EditorPaneHandle | null) => void;
  onCloseTab: (id: number) => void;
  onCursorChange?: (id: number, pos: EditorCursorPosition | null) => void;
  onFormat?: (id: number) => void;
};

export function EditorStack({
  tabs,
  activeId,
  onDirtyChange,
  registerHandle,
  onCloseTab,
  onCursorChange,
  onFormat,
}: Props) {
  const editors = tabs.filter((t): t is EditorTab => t.kind === "editor");

  // Stable per-tab callbacks. Inline arrows in `ref` and `onDirtyChange`
  // change identity every render, which makes React detach+reattach the ref
  // callback and re-invoke `onDirtyChange`, triggering setState loops in
  // the parent. Memoizing per id keeps each callback's identity stable.
  const registerRef = useRef(registerHandle);
  const dirtyRef = useRef(onDirtyChange);
  const closeRef = useRef(onCloseTab);
  const formatRef = useRef(onFormat);
  useEffect(() => {
    registerRef.current = registerHandle;
  }, [registerHandle]);
  useEffect(() => {
    dirtyRef.current = onDirtyChange;
  }, [onDirtyChange]);
  useEffect(() => {
    closeRef.current = onCloseTab;
  }, [onCloseTab]);
  useEffect(() => {
    formatRef.current = onFormat;
  }, [onFormat]);

  const refCallbacks = useRef(
    new Map<number, (h: EditorPaneHandle | null) => void>(),
  );
  const dirtyCallbacks = useRef(new Map<number, (dirty: boolean) => void>());
  const closeCallbacks = useRef(new Map<number, () => void>());
  const formatCallbacks = useRef(new Map<number, () => void>());

  const getRefCallback = (id: number) => {
    let cb = refCallbacks.current.get(id);
    if (!cb) {
      cb = (h: EditorPaneHandle | null) => registerRef.current(id, h);
      refCallbacks.current.set(id, cb);
    }
    return cb;
  };
  const getDirtyCallback = (id: number) => {
    let cb = dirtyCallbacks.current.get(id);
    if (!cb) {
      cb = (dirty: boolean) => dirtyRef.current(id, dirty);
      dirtyCallbacks.current.set(id, cb);
    }
    return cb;
  };
  const getCloseCallback = (id: number) => {
    let cb = closeCallbacks.current.get(id);
    if (!cb) {
      cb = () => closeRef.current(id);
      closeCallbacks.current.set(id, cb);
    }
    return cb;
  };
  const getFormatCallback = (id: number) => {
    let cb = formatCallbacks.current.get(id);
    if (!cb) {
      cb = () => formatRef.current?.(id);
      formatCallbacks.current.set(id, cb);
    }
    return cb;
  };

  const cursorCallbacks = useRef(
    new Map<number, (pos: EditorCursorPosition | null) => void>(),
  );

  const getCursorCallback = (id: number) => {
    let cb = cursorCallbacks.current.get(id);
    if (!cb) {
      cb = (pos) => onCursorChange?.(id, pos);
      cursorCallbacks.current.set(id, cb);
    }
    return cb;
  };

  // Drop callback entries for closed tabs to avoid unbounded growth.
  useEffect(() => {
    const live = new Set(editors.map((t) => t.id));
    for (const id of refCallbacks.current.keys()) {
      if (!live.has(id)) refCallbacks.current.delete(id);
    }
    for (const id of dirtyCallbacks.current.keys()) {
      if (!live.has(id)) dirtyCallbacks.current.delete(id);
    }
    for (const id of closeCallbacks.current.keys()) {
      if (!live.has(id)) closeCallbacks.current.delete(id);
    }
    for (const id of formatCallbacks.current.keys()) {
      if (!live.has(id)) formatCallbacks.current.delete(id);
    }
    for (const id of cursorCallbacks.current.keys()) {
      if (!live.has(id)) cursorCallbacks.current.delete(id);
    }
  }, [editors]);

  if (editors.length === 0) return null;
  return (
    <div className="relative h-full w-full">
      {editors.map((t) => {
        const visible = t.id === activeId;
        return (
          <div
            key={t.id}
            className={cn(
              "absolute inset-0",
              !visible && "invisible pointer-events-none",
            )}
            aria-hidden={!visible}
          >
            {isMarkdownPath(t.path) ? (
              <MarkdownEditorPane
                ref={getRefCallback(t.id)}
                path={t.path}
                viewHint={t.markdownView}
                viewHintSeq={t.markdownViewSeq}
                visible={visible}
                onDirtyChange={getDirtyCallback(t.id)}
                onClose={getCloseCallback(t.id)}
                onCursorChange={getCursorCallback(t.id)}
                onFormat={getFormatCallback(t.id)}
              />
            ) : (
              <div className="h-full overflow-hidden rounded-md border border-border/30 bg-background">
                <EditorPane
                  ref={getRefCallback(t.id)}
                  path={t.path}
                  onDirtyChange={getDirtyCallback(t.id)}
                  onClose={getCloseCallback(t.id)}
                  onCursorChange={getCursorCallback(t.id)}
                  onFormat={getFormatCallback(t.id)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
