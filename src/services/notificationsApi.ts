import { apiRequest } from './apiClient';
import type { SavingsKpisResponse, NotificationsResponse, NotificationResponse, AdoptionKpisResponse } from './apiTypes';

export async function fetchSavingsKpis(token: string): Promise<SavingsKpisResponse> {
  return apiRequest<SavingsKpisResponse>('/kpis/savings', { token });
}

export async function fetchNotifications(token: string): Promise<NotificationsResponse> {
  return apiRequest<NotificationsResponse>('/notifications', { token });
}

export async function markNotificationRead(token: string, notificationId: string): Promise<NotificationResponse> {
  return apiRequest<NotificationResponse>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
    token,
  });
}

export async function dismissNotification(token: string, notificationId: string): Promise<NotificationResponse> {
  return apiRequest<NotificationResponse>(`/notifications/${encodeURIComponent(notificationId)}/dismiss`, {
    method: 'PATCH',
    token,
  });
}

export async function fetchAdoptionKpis(token: string): Promise<AdoptionKpisResponse> {
  return apiRequest<AdoptionKpisResponse>('/kpis/adoption', { token });
}
