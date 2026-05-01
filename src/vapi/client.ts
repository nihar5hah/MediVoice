const VAPI_BASE_URL = 'https://api.vapi.ai';

export interface VapiCallRequest {
  assistantId?: string;
  assistant?: {
    name?: string;
    model?: {
      provider: string;
      model: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
      messages?: Array<{
        role: string;
        content: string;
      }>;
      toolIds?: string[];
      functions?: Array<{
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      }>;
    };
    voice?: {
      provider: string;
      voiceId: string;
    };
    firstMessage?: string;
    language?: string;
    recordingEnabled?: boolean;
    endCallFunctionEnabled?: boolean;
    voicemailDetectionEnabled?: boolean;
    transcriber?: {
      provider: string;
      model: string;
      language?: string;
    };
  };
  phoneNumberId: string;
  customer?: {
    number?: string;
    name?: string;
  };
  name?: string;
}

export interface VapiCallResponse {
  id: string;
  orgId: string;
  status: string;
  type: string;
  assistantId?: string;
  customer?: { number?: string; name?: string };
  phoneNumber?: { id: string; number: string };
  createdAt: string;
  updatedAt: string;
}

export interface VapiTool {
  id: string;
  type: string;
  function?: {
    name?: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
  server?: {
    url?: string;
  };
}

export interface VapiAssistant {
  id: string;
  name?: string;
  firstMessage?: string;
  model?: {
    provider?: string;
    model?: string;
    toolIds?: string[];
    messages?: Array<{ role: string; content: string }>;
  };
}

export interface VapiPhoneNumber {
  id: string;
  number?: string;
  name?: string;
  status?: string;
  assistantId?: string | null;
  server?: {
    url?: string;
  };
}

export class VapiClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.VAPI_PRIVATE_KEY ?? '';
    if (!this.apiKey) {
      throw new Error('VAPI_PRIVATE_KEY is required');
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${VAPI_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vapi API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async createCall(request: VapiCallRequest): Promise<VapiCallResponse> {
    return this.request<VapiCallResponse>('/call', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async createAssistant(request: Record<string, unknown>): Promise<VapiAssistant> {
    return this.request<VapiAssistant>('/assistant', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async updateAssistant(assistantId: string, request: Record<string, unknown>): Promise<VapiAssistant> {
    return this.request<VapiAssistant>(`/assistant/${assistantId}`, {
      method: 'PATCH',
      body: JSON.stringify(request)
    });
  }

  async listAssistants(limit = 20): Promise<VapiAssistant[]> {
    return this.request<VapiAssistant[]>(`/assistant?limit=${limit}`);
  }

  async createTool(request: Record<string, unknown>): Promise<VapiTool> {
    return this.request<VapiTool>('/tool', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async listTools(limit = 50): Promise<VapiTool[]> {
    return this.request<VapiTool[]>(`/tool?limit=${limit}`);
  }

  async listPhoneNumbers(): Promise<VapiPhoneNumber[]> {
    return this.request<VapiPhoneNumber[]>('/phone-number');
  }

  async updatePhoneNumber(phoneNumberId: string, request: Record<string, unknown>): Promise<VapiPhoneNumber> {
    return this.request<VapiPhoneNumber>(`/phone-number/${phoneNumberId}`, {
      method: 'PATCH',
      body: JSON.stringify(request)
    });
  }

  async getCall(callId: string): Promise<VapiCallResponse> {
    return this.request<VapiCallResponse>(`/call/${callId}`);
  }

  async listCalls(limit = 10): Promise<{ calls: VapiCallResponse[] }> {
    return this.request<{ calls: VapiCallResponse[] }>(`/call?limit=${limit}`);
  }

  async endCall(callId: string): Promise<VapiCallResponse> {
    return this.request<VapiCallResponse>(`/call/${callId}/end`, {
      method: 'POST'
    });
  }
}
