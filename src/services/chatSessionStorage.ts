import type { AiChatMessage } from './api';

const STORAGE_PREFIX = 'finops:chat:v1:';
const MAX_MESSAGES = 100;
const MAX_STORAGE_BYTES = 256_000;

export interface StoredChatMessage extends AiChatMessage {
  readonly id: string;
}

export function chatSessionKey(userId: string, tenantId: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(tenantId)}`;
}

export function loadChatSession(key: string, welcome: StoredChatMessage): StoredChatMessage[] {
  if (typeof window === 'undefined') return [welcome];
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) return [welcome];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [welcome];
    const messages = parsed.filter(isStoredMessage).slice(-MAX_MESSAGES);
    return messages.length > 0 ? messages : [welcome];
  } catch {
    return [welcome];
  }
}

export function saveChatSession(key: string, messages: readonly StoredChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    const bounded = messages.slice(-MAX_MESSAGES);
    let serialized = JSON.stringify(bounded);
    if (serialized.length > MAX_STORAGE_BYTES) {
      serialized = JSON.stringify(bounded.slice(-50));
    }
    window.sessionStorage.setItem(key, serialized);
  } catch {
    // Storage can be disabled or full; chat remains usable in memory.
  }
}

export function clearChatSessionHistory(): void {
  if (typeof window === 'undefined') return;
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) window.sessionStorage.removeItem(key);
  }
}

export function clearChatSession(key: string): void {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
}

function isStoredMessage(value: unknown): value is StoredChatMessage {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate['id'] === 'string'
    && (candidate['role'] === 'user' || candidate['role'] === 'assistant')
    && typeof candidate['content'] === 'string'
    && candidate['content'].trim() !== '';
}
