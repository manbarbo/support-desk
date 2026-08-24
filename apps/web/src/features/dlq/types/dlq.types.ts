export interface DLQMessage {
  id: string;
  content: unknown;
  headers: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
  lastError: string;
  lastErrorAt: string;
  originalQueue: string;
}

export interface DLQListResult {
  messages: DLQMessage[];
  total: number;
}

export interface DLQReprocessResult {
  success: boolean;
  message: string;
}

export interface DLQReprocessAllResult {
  success: boolean;
  reprocessed: number;
}
