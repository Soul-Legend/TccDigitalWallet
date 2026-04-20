import {create} from 'zustand';
import {LogEntry} from '../types';
import {AppModule, AppModuleType} from '../utils/constants';

interface AppState {
  // Logs
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;

  // Holder state
  holderDID: string | null;
  setHolderDID: (did: string) => void;

  // Issuer state
  issuerDID: string | null;
  setIssuerDID: (did: string) => void;

  // Navigation state
  currentModule: AppModuleType;
  setCurrentModule: (module: AppModuleType) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Logs
  logs: [],
  addLog: (log) =>
    set((state) => ({
      logs: [
        ...state.logs.slice(-999),
        {
          ...log,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        },
      ],
    })),
  clearLogs: () => set({logs: []}),

  // Holder state
  holderDID: null,
  setHolderDID: (did) => set({holderDID: did}),

  // Issuer state
  issuerDID: null,
  setIssuerDID: (did) => set({issuerDID: did}),

  // Navigation state
  currentModule: AppModule.HOME,
  setCurrentModule: (module) => set({currentModule: module}),
}));
