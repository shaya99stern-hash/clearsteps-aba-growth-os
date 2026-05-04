import type { ImportResult, ImportTemplate } from "@/lib/domain/types";

export function validateHeaders(headers: string[], template: ImportTemplate): ImportResult {
  const normalized = headers.map((header) => header.trim());
  const missing = template.headers.filter((header) => !normalized.includes(header));
  const extra = normalized.filter((header) => header && !template.headers.includes(header));

  return {
    valid: missing.length === 0,
    errors: missing.map((header) => `Missing required column: ${header}`),
    warnings: extra.map((header) => `Unrecognized column will be ignored unless mapped manually: ${header}`),
    rowCount: 0,
  };
}

export function isBlankTemplateCsv(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.length <= 1;
}
