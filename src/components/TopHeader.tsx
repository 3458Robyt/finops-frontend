
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccessToken } from '../auth/authSession';
import { roleLabel, type CurrentView } from './navigation';
import { formatCurrencyAmount } from '../utils/formatCurrency';
import { shareInFlightRequest } from '../services/shareInFlightRequest';
import {
  dismissNotification,
  fetchNotifications,
  markNotificationRead,
  type ApiRole,
  type AuthTenant,
  type InAppNotification,
} from '../services/api';

interface TopHeaderProps {
  currentView: CurrentView;
  activeTenant: AuthTenant;
  availableTenants: readonly AuthTenant[];
  onTenantChange: (tenantId: string) => Promise<void>;
  role: ApiRole;
}

const viewTitles: Partial<Record<CurrentView, string>> = {
  dashboard: 'Panel Ejecutivo ROI',
  budgets: 'Presupuestos FinOps',
  cost_allocation: 'Asignación de costos',
  console: 'Consola Técnica FinOps',
  chat: 'Asistente Inteligente',
  history: 'Historial de Optimizaciones',
  profile: 'Perfil de Usuario y Seguridad',
  agent_settings: 'Gobierno del Agente IA',
  messaging: 'Mensajería',
  ingesta: 'Ingesta y Calidad de Datos',
  metricas_tecnicas: 'Métricas Técnicas',
  master_admin: 'Administracion MSP',
  value_realization: 'Centro de valor realizado',
};

export default function TopHeader({
  currentView,
  activeTenant,
  availableTenants,
  onTenantChange,
  role,
}: TopHeaderProps) {
  const token = useAccessToken();
  const [notifications, setNotifications] = useState<readonly InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switchingTenant, setSwitchingTenant] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const visibleUnreadCount = useMemo(
    () => Math.min(unreadCount, 9),
    [unreadCount],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    shareInFlightRequest(`notifications:${token}`, () => fetchNotifications(token))
      .then((response) => {
        if (active) {
          setNotifications(response.notifications);
          setUnreadCount(response.meta.unreadCount);
        }
      })
      .catch(() => {
        if (active) {
          setNotifications([]);
          setUnreadCount(0);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkRead = async (notification: InAppNotification) => {
    if (!notification.persisted) {
      return;
    }

    await markNotificationRead(token, notification.id);
    setNotifications((current) => current.map((item) => (
      item.id === notification.id ? { ...item, status: 'READ' } : item
    )));
    setUnreadCount((current) => Math.max(current - 1, 0));
  };

  const handleDismiss = async (notification: InAppNotification) => {
    if (!notification.persisted) {
      return;
    }

    await dismissNotification(token, notification.id);
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    if (notification.status === 'UNREAD') {
      setUnreadCount((current) => Math.max(current - 1, 0));
    }
  };

  const handleTenantChange = async (tenantId: string) => {
    if (tenantId === activeTenant.id || switchingTenant) {
      return;
    }

    setSwitchingTenant(true);
    try {
      await onTenantChange(tenantId);
    } finally {
      setSwitchingTenant(false);
    }
  };

  if (currentView === 'login') return null;

  return (
    <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-3 py-3 backdrop-blur-sm sm:px-4 lg:px-6 lg:py-4 xl:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-8">
        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-tak-yellow shadow-sm lg:hidden">
          <span className="material-symbols-outlined text-zinc-950 text-xl font-bold">query_stats</span>
        </div>
        <h1 className="hidden min-w-0 truncate font-display text-xl font-bold tracking-tight text-white sm:block">
          {viewTitles[currentView] || 'FinOps TAK Colombia'}
        </h1>
      </div>
      
      <div className="ml-3 flex min-w-0 items-center gap-2 sm:gap-3 lg:gap-6">
          <div className="relative flex min-w-0 max-w-[calc(100vw-7rem)] cursor-pointer flex-col items-end sm:mr-2">
            <span className="mb-1 hidden text-[10px] font-bold uppercase tracking-widest text-zinc-500 sm:block">
               Tenant activo · {roleLabel(role)}
            </span>
            <select
              aria-label="Tenant activo"
              value={activeTenant.id}
              onChange={(e) => { void handleTenantChange(e.target.value); }}
              disabled={switchingTenant || availableTenants.length <= 1}
              className="ui-control max-w-[170px] appearance-none px-2 pr-7 text-xs font-bold text-tak-yellow outline-none focus:ring-1 focus:ring-tak-yellow sm:max-w-[220px] sm:px-3"
            >
              {availableTenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 mt-1 flex items-center px-2 text-sm text-tak-yellow sm:mt-4">
            <span className="material-symbols-outlined text-sm">expand_more</span>
          </div>
        </div>

        <div className="hidden h-8 w-px bg-zinc-800 sm:block"></div>

        <div ref={containerRef} className="relative">
          <button
            onClick={() => setOpen((current) => !current)}
            className="ui-icon-button relative shrink-0"
            aria-label="Abrir notificaciones"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 rounded-full border-2 border-zinc-900 text-[10px] font-black text-white flex items-center justify-center">
                {visibleUnreadCount}{unreadCount > 9 ? '+' : ''}
              </span>
            )}
          </button>

          {open && (
            <div className="ui-popover absolute right-0 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white">Notificaciones FinOps</p>
                  <p className="text-[11px] text-zinc-500">Alertas, análisis y recordatorios del tenant activo</p>
                </div>
                <span className="material-symbols-outlined text-tak-yellow text-lg">savings</span>
              </div>

              <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <p className="px-4 py-6 text-sm font-bold text-zinc-500">Cargando recordatorios...</p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm font-bold text-zinc-500">Sin notificaciones por ahora.</p>
                ) : notifications.map((notification) => (
                  <div key={notification.id} className="border-b border-zinc-800 last:border-b-0 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-zinc-100">{notification.title}</p>
                        <p className="text-xs leading-relaxed text-zinc-400 mt-1">{notification.message}</p>
                      </div>
                      <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-black uppercase ${notification.persisted ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'bg-tak-yellow/10 text-tak-yellow border border-tak-yellow/20'}`}>
                        {notification.persisted ? notification.status : 'preview'}
                      </span>
                    </div>
                    {notification.missedSavingsAmount !== undefined && (
                      <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-tak-yellow">
                        Ahorro no capturado: {formatCurrency(notification.missedSavingsAmount, notification.currency)}
                      </p>
                    )}
                    {notification.persisted && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => void handleMarkRead(notification)}
                          className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900"
                        >
                          Leido
                        </button>
                        <button
                          onClick={() => void handleDismiss(notification)}
                          className="rounded-lg border border-zinc-800 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900"
                        >
                          Descartar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function formatCurrency(value: number, currency: string): string {
  return formatCurrencyAmount(value, currency);
}
