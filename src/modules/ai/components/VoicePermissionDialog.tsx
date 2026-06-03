import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mic01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type Props = {
  open: boolean;
  denied: boolean;
  requesting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function VoicePermissionDialog({
  open,
  denied,
  requesting,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent size="default" className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <HugeiconsIcon icon={Mic01Icon} strokeWidth={1.75} />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {denied ? "麦克风权限被拒绝" : "启用语音输入"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {denied ? (
              <>
                请在浏览器或系统设置中允许灵码 ADE 访问麦克风，然后重试。开发模式下可在地址栏左侧的站点权限中修改。
              </>
            ) : (
              <>
                语音输入需要使用麦克风。点击「允许」后，请在随后出现的系统权限弹窗中选择允许。
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={requesting}>取消</AlertDialogCancel>
          {!denied ? (
            <AlertDialogAction
              disabled={requesting}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              {requesting ? "请求中…" : "允许"}
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              重试
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
