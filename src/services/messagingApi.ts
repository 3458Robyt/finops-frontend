import { apiRequest } from './apiClient';
import type { TelegramLinksResponse, TelegramLinkResponse, TelegramSelfLinkCodeResponse, OutboundChannelStatusResponse, OutboundDeliveriesResponse, OutboundSendResponse } from './apiTypes';

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
