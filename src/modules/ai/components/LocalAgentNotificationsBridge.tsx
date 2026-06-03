import { routeAgentNotification } from "@/modules/agents/lib/route";
import { useWindowFocus } from "@/modules/agents/lib/useWindowFocus";
import { useAgentStore } from "@/modules/agents/store/agentStore";
import type { AgentStatus } from "@/modules/agents/lib/types";
import { useEffect, useRef } from "react";
import { useChatStore } from "../store/chatStore";

const AGENT = "灵码ADE";

type RunStatus =
  | "idle"
  | "thinking"
  | "streaming"
  | "awaiting-approval"
  | "error";

function isBusy(s: RunStatus): boolean {
  return s === "thinking" || s === "streaming" || s === "awaiting-approval";
}

function liveStatus(s: RunStatus): AgentStatus | null {
  if (s === "awaiting-approval") return "waiting";
  if (s === "thinking" || s === "streaming") return "working";
  return null;
}

export function LocalAgentNotificationsBridge() {
  const status = useChatStore((s) => s.agentMeta.status) as RunStatus;
  const error = useChatStore((s) => s.agentMeta.error);
  const visible = useChatStore((s) => s.panelOpen);
  const focused = useWindowFocus();

  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const prev = useRef<RunStatus>(status);

  useEffect(() => {
    useAgentStore.getState().setLocalAgent(
      liveStatus(status) ? { agent: AGENT, status: liveStatus(status)! } : null,
    );

    const was = prev.current;
    prev.current = status;
    if (was === status) return;

    const fire = (
      kind: "attention" | "finished" | "error",
      title: string,
      body?: string,
    ) =>
      routeAgentNotification({
        source: "local",
        agent: AGENT,
        kind,
        title,
        body,
        focused: focusedRef.current,
        visible: visibleRef.current,
        allowToast: true,
        onActivate: () => useChatStore.getState().openPanel(),
      });

    if (status === "awaiting-approval") {
      fire("attention", "灵码ADE 需要您的审批", "批准工具以继续执行");
    } else if (status === "error") {
      fire("error", "灵码ADE 运行失败", error ?? undefined);
    } else if (status === "idle" && isBusy(was)) {
      fire("finished", "灵码ADE 已完成", "您的任务已就绪");
    }
  }, [status, error]);

  return null;
}
