export type ConnectorStatus = "configured" | "not configured" | "needs API key" | "connected" | "error" | "disabled";

export interface ConnectorDefinition {
  id: string;
  name: string;
  type: string;
  status: ConnectorStatus;
  requiredEnvVar?: string;
  setupNote: string;
}
