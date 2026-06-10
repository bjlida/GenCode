import { createContext, useContext, type ReactNode } from "react";
import { useUpdater } from "./useUpdater";

type UpdaterApi = ReturnType<typeof useUpdater>;

const UpdaterContext = createContext<UpdaterApi | null>(null);

export function UpdaterProvider({
  children,
  autoCheck = true,
}: {
  children: ReactNode;
  autoCheck?: boolean;
}) {
  const api = useUpdater({ autoCheck });
  return (
    <UpdaterContext.Provider value={api}>{children}</UpdaterContext.Provider>
  );
}

export function useUpdaterContext(): UpdaterApi {
  const ctx = useContext(UpdaterContext);
  if (!ctx) {
    throw new Error("useUpdaterContext must be used within UpdaterProvider");
  }
  return ctx;
}
