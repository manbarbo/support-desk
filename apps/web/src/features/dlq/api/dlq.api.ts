import { apiClient } from "@/lib/api/client";
import type { DLQListResult, DLQMessage } from "../types/dlq.types";

export async function getDLQMessages(limit?: number): Promise<DLQListResult> {
  const params = limit ? `?limit=${limit}` : "";
  return apiClient<DLQListResult>(`/admin/dlq${params}`, {
    cache: "no-store",
  });
}

export async function getDLQMessage(messageId: string): Promise<DLQMessage> {
  return apiClient<DLQMessage>(`/admin/dlq/${messageId}`, {
    cache: "no-store",
  });
}

export async function reprocessDLQMessage(
  messageId: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient(`/admin/dlq/${messageId}/reprocess`, {
    method: "POST",
  });
}

export async function reprocessAllDLQMessages(): Promise<{
  success: boolean;
  reprocessed: number;
}> {
  return apiClient("/admin/dlq/reprocess-all", {
    method: "POST",
  });
}

export async function deleteDLQMessage(
  messageId: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient(`/admin/dlq/${messageId}`, {
    method: "DELETE",
  });
}
