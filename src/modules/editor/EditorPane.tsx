import { redo, undo } from "@codemirror/commands";
import {
  findNext,
  findPrevious,
  replaceAll,
  replaceNext,
  SearchQuery,
  setSearchQuery,
} from "@codemirror/search";
import { keymap, EditorView } from "@codemirror/view";
import { usePreferencesStore } from "@/modules/settings/preferences";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useEditorThemeExtension } from "./lib/useEditorTheme";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Prec, type Extension } from "@codemirror/state";
import { vim } from "@replit/codemirror-vim";
import {
  buildSharedExtensions,
  languageCompartment,
  vimCompartment,
  wrapCompartment,
} from "./lib/extensions";
import { initVimGlobals, vimHandlersExtension } from "./lib/vim";

initVimGlobals();
import { resolveLanguage } from "./lib/languageResolver";
import { useDocument } from "./lib/useDocument";
import { inlineCompletion } from "./lib/autocomplete/inlineExtension";
import { EditorContextMenu } from "./EditorContextMenu";
import { buildFormatCommand } from "./lib/formatDocument";
import { getKey } from "@/modules/ai/lib/keyring";
import { onKeysChanged } from "@/modules/settings/store";

export type EditorCursorPosition = { line: number; col: number };

export type EditorPaneHandle = {
  setQuery: (q: string) => void;
  findNext: () => void;
  findPrevious: () => void;
  clearQuery: () => void;
  focus: () => void;
  getSelection: () => string | null;
  getSelectionRect: () => {
    left: number;
    top: number;
    width: number;
    bottom: number;
    editorLeft: number;
    editorRight: number;
    anchorY: number;
  } | null;
  getPath: () => string;
  getCursorPosition: () => EditorCursorPosition | null;
  setReplaceQuery: (replace: string) => void;
  replaceNext: () => void;
  replaceAll: () => void;
  /** Re-read the file from disk. Skips silently if the buffer is dirty. */
  reload: () => boolean;
  /** Save buffer to disk. Returns false if nothing to save or save failed. */
  save: () => Promise<boolean>;
  /** Apply CodeMirror's undo/redo commands. */
  undo: () => void;
  redo: () => void;
  /** Current buffer text (null if the editor is not ready). */
  getContent: () => string | null;
};

type Props = {
  path: string;
  /** Tab is on screen — refocus when switching back from terminal/other tabs. */
  visible?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved?: () => void;
  onClose?: () => void;
  onCursorChange?: (pos: EditorCursorPosition | null) => void;
  onFormat?: () => void;
  /** Fired once when the buffer is loaded and CodeMirror is mounted. */
  onReady?: () => void;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const EditorPane = forwardRef<EditorPaneHandle, Props>(
  function EditorPane(
    {
      path,
      visible = true,
      onDirtyChange,
      onSaved,
      onClose,
      onCursorChange,
      onFormat,
      onReady,
    },
    ref,
  ) {
    const { doc, contentKey, onChange, save, reload } = useDocument({
      path,
      onDirtyChange,
    });
    const reloadRef = useRef(reload);
    reloadRef.current = reload;
    const cmRef = useRef<ReactCodeMirrorRef>(null);
    const { themeExt } = useEditorThemeExtension();
    const vimMode = usePreferencesStore((s) => s.vimMode);
    const editorWordWrap = usePreferencesStore((s) => s.editorWordWrap);
    const languageRef = useRef<string | null>(null);
    const apiKeyRef = useRef<string | null>(null);

    useEffect(() => {
      let cancelled = false;
      const refresh = async () => {
        const provider = usePreferencesStore.getState().autocompleteProvider;
        if (provider === "lmstudio" || provider === "mlx" || provider === "ollama") {
          apiKeyRef.current = null;
          return;
        }
        const k = await getKey(provider);
        if (!cancelled) apiKeyRef.current = k;
      };
      void refresh();
      let unlistenKeys: (() => void) | undefined;
      void onKeysChanged(() => void refresh()).then((un) => {
        unlistenKeys = un;
      });
      const unsubPrefs = usePreferencesStore.subscribe((state, prev) => {
        if (state.autocompleteProvider !== prev.autocompleteProvider) {
          void refresh();
        }
      });
      return () => {
        cancelled = true;
        unlistenKeys?.();
        unsubPrefs();
      };
    }, []);

    // Stabilize save + onSaved via refs so the extensions array never changes
    // identity — a new identity makes @uiw/react-codemirror reconfigure the
    // whole state, wiping the language compartment.
    const saveRef = useRef(save);
    saveRef.current = save;
    const onSavedRef = useRef(onSaved);
    onSavedRef.current = onSaved;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const pathRef = useRef(path);
    pathRef.current = path;

    const onCursorChangeRef = useRef(onCursorChange);
    onCursorChangeRef.current = onCursorChange;
    const onFormatRef = useRef(onFormat);
    onFormatRef.current = onFormat;
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const formatEnabled = buildFormatCommand(path) !== null;

    const searchQueryRef = useRef("");
    const replaceQueryRef = useRef("");

    const extensions = useMemo(
      () => [
        vimCompartment.of(
          usePreferencesStore.getState().vimMode ? Prec.highest(vim()) : [],
        ),
        wrapCompartment.of(
          usePreferencesStore.getState().editorWordWrap
            ? EditorView.lineWrapping
            : [],
        ),
        vimHandlersExtension(() => ({
          save: () => {
            void (async () => {
              await saveRef.current();
              onSavedRef.current?.();
            })();
          },
          close: () => onCloseRef.current?.(),
        })),
        ...buildSharedExtensions(),
        languageCompartment.of([]),
        inlineCompletion({
          getPrefs: () => {
            const s = usePreferencesStore.getState();
            const p = s.autocompleteProvider;
            const modelId =
              p === "lmstudio"
                ? s.lmstudioModelId
                : p === "mlx"
                  ? s.mlxModelId
                  : p === "ollama"
                    ? s.ollamaModelId
                    : p === "openai-compatible"
                      ? s.openaiCompatibleModelId
                      : p === "openrouter"
                        ? s.openrouterModelId
                        : s.autocompleteModelId;
            return {
              enabled: s.autocompleteEnabled,
              provider: p,
              modelId,
              apiKey: apiKeyRef.current,
              lmstudioBaseURL: s.lmstudioBaseURL,
              mlxBaseURL: s.mlxBaseURL,
              ollamaBaseURL: s.ollamaBaseURL,
              openaiCompatibleBaseURL: s.openaiCompatibleBaseURL,
            };
          },
          getPath: () => pathRef.current,
          getLanguage: () => languageRef.current,
        }),
        keymap.of([
          {
            key: "Mod-s",
            preventDefault: true,
            run: () => {
              void (async () => {
                await saveRef.current();
                onSavedRef.current?.();
              })();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (!update.selectionSet && !update.docChanged) return;
          const view = update.view;
          const pos = view.state.selection.main.head;
          const line = view.state.doc.lineAt(pos);
          onCursorChangeRef.current?.({
            line: line.number,
            col: pos - line.from + 1,
          });
        }),
      ],
      [],
    );

    useEffect(() => {
      const view = cmRef.current?.view;
      if (!view) return;
      view.dispatch({
        effects: vimCompartment.reconfigure(
          vimMode ? Prec.highest(vim()) : [],
        ),
      });
    }, [vimMode]);

    useEffect(() => {
      const view = cmRef.current?.view;
      if (!view) return;
      view.dispatch({
        effects: wrapCompartment.reconfigure(
          editorWordWrap ? EditorView.lineWrapping : [],
        ),
      });
    }, [editorWordWrap]);

    useEffect(() => {
      let cancelled = false;
      const ext = path.split(".").pop()?.toLowerCase() ?? null;
      languageRef.current = ext;
      const resolve = async (): Promise<Extension> => {
        if (path.toLowerCase().endsWith(".gencode-theme")) {
          const [{ json }, { colorSwatches }] = await Promise.all([
            import("@codemirror/lang-json"),
            import("./lib/colorSwatches"),
          ]);
          return [json(), colorSwatches()];
        }
        return (await resolveLanguage(path)) ?? [];
      };
      void resolve().then((extension) => {
        if (cancelled) return;
        const view = cmRef.current?.view;
        if (!view) return;
        view.dispatch({
          effects: languageCompartment.reconfigure(extension),
        });
      });
      return () => {
        cancelled = true;
      };
    }, [path, doc.status]);

    useEffect(() => {
      if (doc.status !== "ready") return;
      let cancelled = false;
      const notify = () => {
        if (cancelled || !cmRef.current?.view) return;
        onReadyRef.current?.();
      };
      const id = requestAnimationFrame(notify);
      return () => {
        cancelled = true;
        cancelAnimationFrame(id);
      };
    }, [doc.status, path, contentKey]);

    useEffect(() => {
      if (!visible || doc.status !== "ready") return;
      let cancelled = false;
      const id = requestAnimationFrame(() => {
        if (cancelled) return;
        const view = cmRef.current?.view;
        if (!view) return;
        view.focus();
        onReadyRef.current?.();
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(id);
      };
    }, [visible, doc.status, path, contentKey]);

    useImperativeHandle(
      ref,
      () => ({
        setQuery: (q: string) => {
          const view = cmRef.current?.view;
          if (!view) return;
          searchQueryRef.current = q;
          view.dispatch({
            effects: setSearchQuery.of(
              new SearchQuery({
                search: q,
                replace: replaceQueryRef.current,
                caseSensitive: false,
              }),
            ),
          });
          if (q) findNext(view);
        },
        setReplaceQuery: (replace: string) => {
          replaceQueryRef.current = replace;
          const view = cmRef.current?.view;
          if (!view) return;
          view.dispatch({
            effects: setSearchQuery.of(
              new SearchQuery({
                search: searchQueryRef.current,
                replace,
                caseSensitive: false,
              }),
            ),
          });
        },
        replaceNext: () => {
          const view = cmRef.current?.view;
          if (view) replaceNext(view);
        },
        replaceAll: () => {
          const view = cmRef.current?.view;
          if (view) replaceAll(view);
        },
        findNext: () => {
          const view = cmRef.current?.view;
          if (view) findNext(view);
        },
        findPrevious: () => {
          const view = cmRef.current?.view;
          if (view) findPrevious(view);
        },
        clearQuery: () => {
          const view = cmRef.current?.view;
          if (!view) return;
          view.dispatch({
            effects: setSearchQuery.of(new SearchQuery({ search: "" })),
          });
        },
        focus: () => {
          const view = cmRef.current?.view;
          if (!view || view.hasFocus) return;
          view.focus();
        },
        getSelection: () => {
          const view = cmRef.current?.view;
          if (!view) return null;
          const { from, to } = view.state.selection.main;
          if (from === to) return null;
          return view.state.sliceDoc(from, to);
        },
        getSelectionRect: () => {
          const view = cmRef.current?.view;
          if (!view) return null;
          const { from, to } = view.state.selection.main;
          if (from === to) return null;
          const start = view.coordsAtPos(from);
          const end = view.coordsAtPos(to);
          const editor = view.dom.getBoundingClientRect();
          const base = {
            editorLeft: editor.left,
            editorRight: editor.right,
          };
          if (!start && !end) {
            return {
              ...base,
              left: editor.left,
              top: editor.top,
              width: editor.width,
              bottom: editor.bottom,
              anchorY: editor.top,
            };
          }
          if (!start) {
            const rect = end!;
            return {
              ...base,
              left: rect.left,
              top: rect.top,
              width: Math.max(1, rect.right - rect.left),
              bottom: rect.bottom,
              anchorY: rect.top,
            };
          }
          if (!end) {
            return {
              ...base,
              left: start.left,
              top: start.top,
              width: Math.max(1, start.right - start.left),
              bottom: start.bottom,
              anchorY: start.top,
            };
          }
          const left = Math.max(editor.left, Math.min(start.left, end.left));
          const right = Math.min(editor.right, Math.max(start.right, end.right));
          const top = Math.max(editor.top, Math.min(start.top, end.top));
          const bottom = Math.max(start.bottom, end.bottom);
          const anchorY = to >= from ? end.top : start.top;
          return {
            ...base,
            left,
            top,
            width: Math.max(1, right - left),
            bottom,
            anchorY,
          };
        },
        getPath: () => path,
        getCursorPosition: () => {
          const view = cmRef.current?.view;
          if (!view) return null;
          const pos = view.state.selection.main.head;
          const line = view.state.doc.lineAt(pos);
          return { line: line.number, col: pos - line.from + 1 };
        },
        reload: () => reloadRef.current(),
        save: async () => {
          try {
            await saveRef.current();
            onSavedRef.current?.();
            return true;
          } catch {
            return false;
          }
        },
        undo: () => {
          const view = cmRef.current?.view;
          if (view) undo(view);
        },
        redo: () => {
          const view = cmRef.current?.view;
          if (view) redo(view);
        },
        getContent: () => {
          const view = cmRef.current?.view;
          if (!view || doc.status !== "ready") return null;
          return view.state.doc.toString();
        },
      }),
      [path, doc.status],
    );

    if (doc.status === "loading") {
      return (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          加载中…
        </div>
      );
    }
    if (doc.status === "error") {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-xs text-destructive">
          {doc.message}
        </div>
      );
    }
    if (doc.status === "binary") {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
          <div className="text-sm text-foreground">二进制文件</div>
          <div className="text-xs text-muted-foreground">
            {formatBytes(doc.size)} · 不支持预览
          </div>
        </div>
      );
    }
    if (doc.status === "toolarge") {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
          <div className="text-sm text-foreground">文件过大</div>
          <div className="text-xs text-muted-foreground">
            {formatBytes(doc.size)} 超过了 {formatBytes(doc.limit)} 的限制。
          </div>
        </div>
      );
    }

    return (
      <EditorContextMenu
        formatEnabled={formatEnabled}
        onFocus={() => cmRef.current?.view?.focus()}
        onUndo={() => {
          const view = cmRef.current?.view;
          if (view) undo(view);
        }}
        onRedo={() => {
          const view = cmRef.current?.view;
          if (view) redo(view);
        }}
        onFormat={() => onFormatRef.current?.()}
      >
        <div className="flex h-full min-h-0 flex-col">
          <CodeMirror
            key={`${path}\0${contentKey}`}
            ref={cmRef}
            value={doc.content}
            onChange={onChange}
            theme={themeExt}
            extensions={extensions}
            height="100%"
            className="flex-1 min-h-0 overflow-hidden"
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              foldGutter: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              searchKeymap: true,
            }}
          />
        </div>
      </EditorContextMenu>
    );
  },
);
