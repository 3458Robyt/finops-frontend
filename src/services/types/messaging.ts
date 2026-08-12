// Telegram and outbound messaging DTOs.
import type { ApiRole } from '../authTypes';
export interface TelegramLinkedUser {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly name: string;
  readonly role: ApiRole;
  readonly status: 'ACTIVE' | 'DISABLED';
}
export interface TelegramChatLink {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly chatId: string;
  readonly telegramUserId?: string;
  readonly telegramUsername?: string;
  readonly status: 'ACTIVE' | 'DISABLED';
  readonly linkedByUserId: string;
  readonly disabledAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly user?: TelegramLinkedUser;
}
export interface TelegramLinksResponse {
  readonly success: true;
  readonly links: readonly TelegramChatLink[];
}
export interface TelegramLinkResponse {
  readonly success: true;
  readonly link: TelegramChatLink;
}
export type OutboundMessageChannel = 'TELEGRAM' | 'EMAIL';
export type OutboundMessageType = 'TEST' | 'SAVINGS_REMINDER' | 'AI_CHAT_RESPONSE' | 'RECOMMENDATION_SUMMARY' | 'EXECUTION_PLAN_READY' | 'BUDGET_ALERT' | 'EXECUTIVE_SUMMARY';
export type OutboundMessageStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'SKIPPED';
export interface OutboundMessageDelivery {
  readonly id: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly recommendationId?: string;
  readonly channel: OutboundMessageChannel;
  readonly messageType: OutboundMessageType;
  readonly status: OutboundMessageStatus;
  readonly subject?: string;
  readonly preview: string;
  readonly providerMessageId?: string;
  readonly errorMessage?: string;
  readonly sentAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface OutboundChannelStatusResponse {
  readonly success: true;
  readonly status: {
    readonly telegram: {
      readonly enabled: boolean;
      readonly botUsernameConfigured: boolean;
      readonly webhookSecretConfigured: boolean;
      readonly activeLinks: number;
      readonly totalLinks: number;
    };
    readonly email: {
      readonly enabled: boolean;
      readonly smtpConfigured: boolean;
    };
  };
}
export interface OutboundDeliveriesResponse {
  readonly success: true;
  readonly deliveries: readonly OutboundMessageDelivery[];
}
export interface OutboundSendResponse {
  readonly success: true;
  readonly deliveries: readonly OutboundMessageDelivery[];
  readonly attemptedUsers?: number;
}
