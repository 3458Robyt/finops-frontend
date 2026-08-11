// Notification DTOs.
export type InAppNotificationStatus = 'UNREAD' | 'READ' | 'DISMISSED';
export type InAppNotificationType =
  | 'SAVINGS_REMINDER'
  | 'BUDGET_ALERT'
  | 'RECOMMENDATION_ANALYSIS_COMPLETED';
export interface InAppNotification {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly recommendationId?: string;
  readonly type: InAppNotificationType;
  readonly status: InAppNotificationStatus;
  readonly title: string;
  readonly message: string;
  readonly missedSavingsAmount?: number;
  readonly estimatedMonthlySavings?: number;
  readonly currency: string;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly generatedForDate?: string;
  readonly metadata?: unknown;
  readonly persisted: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface NotificationsResponse {
  readonly success: true;
  readonly notifications: readonly InAppNotification[];
  readonly meta: {
    readonly count: number;
    readonly unreadCount: number;
    readonly previewCount: number;
  };
}
export interface NotificationResponse {
  readonly success: true;
  readonly notification: InAppNotification;
}
export interface AdoptionKpisResponse {
  readonly success: true;
  readonly adoption: {
    readonly totalRecommendations: number;
    readonly pendingRecommendations: number;
    readonly approvedRecommendations: number;
    readonly rejectedRecommendations: number;
    readonly completedRecommendations: number;
    readonly acceptanceRate: number;
    readonly rejectionRate: number;
    readonly executionRate: number;
  };
}
