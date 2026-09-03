import { apiRequest } from './apiClient';
import type { TelegramLinksResponse, TelegramLinkResponse, TelegramSelfLinkCodeResponse, OutboundChannelStatusResponse, OutboundDeliveriesResponse, OutboundSendResponse, EmailVerifyResponse, TelegramVerifyResponse, MessagingPreferences, MessagingPreferencesResponse } from './apiTypes';

export async function fetchMessagingPreferences(token: string): Promise<MessagingPreferencesResponse> {
  return apiRequest<MessagingPreferencesResponse>('/outbound-messages/preferences', { token });
}

export async function updateMessagingPreferences(token: string, preferences: Partial<MessagingPreferences>): Promise<MessagingPreferencesResponse> {
  const metadataKeys = new Set(['id', 'userId', 'createdAt', 'updatedAt']);
  const update = Object.fromEntries(
    Object.entries(preferences).filter(([key]) => !metadataKeys.has(key)),
  ) as Partial<MessagingPreferences>;
  return apiRequest<MessagingPreferencesResponse>('/outbound-messages/preferences', {
    method: 'PATCH',
    token,
    body: JSON.stringify(update),
  });
}

export async function verifyEmailConfiguration(token: string): Promise<EmailVerifyResponse> {
  return apiRequest<EmailVerifyResponse>('/outbound-messages/email/verify', { method: 'POST', token });
}

export async function verifyTelegramConfiguration(token: string): Promise<TelegramVerifyResponse> {
  return apiRequest<TelegramVerifyResponse>('/outbound-messages/telegram/verify', { method: 'POST', token });
}

export async function fetchTelegramLinks(token: string): Promise<TelegramLinksResponse> {
  return apiRequest<TelegramLinksResponse>('/telegram/links', { token });
}

export async function createTelegramSelfLinkCode(token: string): Promise<TelegramSelfLinkCodeResponse> {
  return apiRequest<TelegramSelfLinkCodeResponse>('/telegram/self-link-code', {
    method: 'POST',
    token,
  });
}

export async function createTelegramLink(
  token: string,
  input: {
    readonly email: string;
    readonly chatId: string;
    readonly telegramUserId?: string;
    readonly telegramUsername?: string;
  },
): Promise<TelegramLinkResponse> {
  return apiRequest<TelegramLinkResponse>('/telegram/links', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function disableTelegramLink(token: string, linkId: string): Promise<TelegramLinkResponse> {
  return apiRequest<TelegramLinkResponse>(`/telegram/links/${encodeURIComponent(linkId)}/disable`, {
    method: 'PATCH',
    token,
  });
}

export async function sendTelegramTestMessage(token: string, linkId: string): Promise<TelegramLinkResponse> {
  return apiRequest<TelegramLinkResponse>(`/telegram/links/${encodeURIComponent(linkId)}/test-message`, {
    method: 'POST',
    token,
  });
}

export async function fetchOutboundChannelStatus(token: string): Promise<OutboundChannelStatusResponse> {
  return apiRequest<OutboundChannelStatusResponse>('/outbound-messages/status', { token });
}

export async function fetchOutboundDeliveries(token: string, limit = 30): Promise<OutboundDeliveriesResponse> {
  return apiRequest<OutboundDeliveriesResponse>(`/outbound-messages/deliveries?limit=${encodeURIComponent(String(limit))}`, { token });
}

export async function sendOutboundTestMessage(
  token: string,
  input: { readonly email?: string; readonly telegramLinkId?: string },
): Promise<OutboundSendResponse> {
  return apiRequest<OutboundSendResponse>('/outbound-messages/test', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function sendSavingsRemindersNow(token: string): Promise<OutboundSendResponse> {
  return apiRequest<OutboundSendResponse>('/outbound-messages/savings-reminders/send', {
    method: 'POST',
    token,
  });
}

export async function sendRecommendationSummaryNow(token: string): Promise<OutboundSendResponse> {
  return apiRequest<OutboundSendResponse>('/outbound-messages/recommendations/summary/send', {
    method: 'POST',
    token,
  });
}

export async function sendExecutiveSummaryNow(token: string): Promise<OutboundSendResponse> {
  return apiRequest<OutboundSendResponse>('/outbound-messages/executive-summary/send', {
    method: 'POST',
    token,
  });
}
