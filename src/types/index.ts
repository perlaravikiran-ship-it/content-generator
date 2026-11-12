// ── Request payload ───────────────────────────────────────────────────────────

export interface GenerateRequest {
  topic: string;
  platform?: string;
  format?: string;
}

// ── Make.com response types ───────────────────────────────────────────────────

export interface MakeComSuccess {
  success: true;
  message: string;
  data: {
    content: string;
    imageUrl: string;
  };
}

export interface MakeComError {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
    custom_message_from_service_provider?: string;
    details: null;
  };
}

export type MakeComResponse = MakeComSuccess | MakeComError;

// ── API envelope ───────────────────────────────────────────────────────────────

export type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };
