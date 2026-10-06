import { useCallback, useEffect, useState } from 'react';
import { useAccessToken } from '../auth/authSession';
import { canManageOutboundChannels } from '../components/navigation';
import {
  fetchMessagingPreferences,
  fetchOutboundChannelStatus,
  fetchOutboundDeliveries,
  fetchTelegramLinks,
  sendOutboundTestMessage,
  sendTelegramTestMessage,
  updateMessagingPreferences,
  verifyEmailConfiguration,
  verifyTelegramConfiguration,
  disableTelegramLink,
  createTelegramSelfLinkCode,
  type TelegramSelfLinkCodeResponse,
  type AuthTenant,
  type ApiRole,
  type MessagingPreferences,
  type OutboundChannelStatusResponse,
  type OutboundMessageDelivery,
  type TelegramChatLink,
} from '../services/api';

interface MessagingProps { readonly role: ApiRole; readonly activeTenant: Pick<AuthTenant, 'id' | 'name'>; }

export default function Messaging({ role, activeTenant }: MessagingProps) {
  const token = useAccessToken();
  const canManage = canManageOutboundChannels(role);
  const [preferences, setPreferences] = useState<MessagingPreferences | null>(null);
  const [status, setStatus] = useState<OutboundChannelStatusResponse['status'] | null>(null);
  const [links, setLinks] = useState<readonly TelegramChatLink[]>([]);
  const [deliveries, setDeliveries] = useState<readonly OutboundMessageDelivery[]>([]);
  const [emailTarget, setEmailTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof MessagingPreferences | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [telegramLinkCode, setTelegramLinkCode] = useState<TelegramSelfLinkCodeResponse | null>(null);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState(false);
  const [telegramLinkCopied, setTelegramLinkCopied] = useState(false);

  const reload = useCallback(async () => {
    const preferenceResponse = await fetchMessagingPreferences(token);
    setPreferences(preferenceResponse.preferences);
    if (!canManage) return;
    const [statusResponse, linksResponse, deliveriesResponse] = await Promise.all([
      fetchOutboundChannelStatus(token),
      fetchTelegramLinks(token),
      fetchOutboundDeliveries(token),
    ]);
    setStatus(statusResponse.status);
    setLinks(linksResponse.links);
    setDeliveries(deliveriesResponse.deliveries);
  }, [canManage, token]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void reload().catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar la mensajería.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const toggle = async (key: keyof MessagingPreferences) => {
    if (preferences === null || typeof preferences[key] !== 'boolean') return;
    setSavingKey(key);
    setError(null);
    setMessage(null);
    try {
      const response = await updateMessagingPreferences(token, { [key]: !preferences[key] });
      setPreferences(response.preferences);
      setMessage('Preferencia guardada.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar la preferencia.');
    } finally { setSavingKey(null); }
  };

  const runAdminAction = async (action: () => Promise<void>, success: string) => {
    setError(null); setMessage(null);
    try { await action(); setMessage(success); await reload(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible completar la operación.'); }
  };

  const generateTelegramLink = async () => {
    setTelegramLinkLoading(true);
    setTelegramLinkCopied(false);
    setError(null);
    setMessage(null);
    try {
      const response = await createTelegramSelfLinkCode(token);
      setTelegramLinkCode(response);
      setMessage(`Enlace generado para ${activeTenant.name}. Ábrelo en Telegram y pulsa Iniciar.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible generar el enlace de Telegram.');
    } finally {
      setTelegramLinkLoading(false);
    }
  };

  const copyTelegramLink = async () => {
    if (telegramLinkCode?.deepLink === undefined) return;
    try {
      await navigator.clipboard.writeText(telegramLinkCode.deepLink);
      setTelegramLinkCopied(true);
    } catch {
      setError('No fue posible copiar el enlace. Usa el comando /start mostrado abajo.');
    }
  };

  if (loading) return <div className="ui-state-screen text-sm font-bold">Cargando mensajería…</div>;

  return (
    <div className="ui-page mx-auto w-full max-w-7xl space-y-6">
      <header className="ui-page-header">
        <div>
        <p className="ui-kicker">Centro de comunicaciones</p>
        <h1 className="ui-page-title mt-2">Mensajería FinOps</h1>
        <p className="ui-page-lead">Activa tus canales para el tenant seleccionado, vincula Telegram y consulta el historial de entregas.</p>
        </div>
        <span className="ui-status ui-status-accent shrink-0">Canales gobernados</span>
      </header>

      {message !== null && <p className="ui-alert-positive px-4 py-3 text-sm font-bold">{message}</p>}
      {error !== null && <p className="ui-alert-danger px-4 py-3 text-sm font-bold">{error}</p>}

      <section className="ui-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7" aria-labelledby="telegram-tenant-link-title">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-sky-300">Telegram · tenant actual</p>
          <h2 id="telegram-tenant-link-title" className="mt-1 text-lg font-black text-white">Vincular con {activeTenant.name}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">Genera un enlace de un solo uso y pulsa Iniciar en el bot. Si tu chat ya está vinculado a tu usuario en otro tenant, esta acción cambia el tenant activo del bot al que tienes seleccionado aquí. Después activa Telegram en tus preferencias inferiores para recibir avisos aquí.</p>
        </div>
        <button type="button" onClick={() => void generateTelegramLink()} disabled={telegramLinkLoading || status?.telegram.enabled === false} className="ui-button ui-button-primary shrink-0 disabled:opacity-50">
          {telegramLinkLoading ? 'Generando enlace…' : 'Vincular Telegram aquí'}
        </button>
        {telegramLinkCode !== null && <div className="w-full rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 sm:basis-full">
          <div className="flex flex-wrap items-center gap-3">
            {telegramLinkCode.deepLink !== undefined && <a href={telegramLinkCode.deepLink} target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-300 underline">Abrir bot y vincular</a>}
            {telegramLinkCode.deepLink !== undefined && <button type="button" onClick={() => void copyTelegramLink()} className="text-xs font-black uppercase text-zinc-300 hover:text-white">{telegramLinkCopied ? 'Enlace copiado' : 'Copiar enlace'}</button>}
            <span className="text-xs text-zinc-500">Vence {new Date(telegramLinkCode.expiresAt).toLocaleTimeString('es-CO')}</span>
          </div>
          <p className="mt-2 break-all font-mono text-xs text-zinc-300">{telegramLinkCode.startCommand}</p>
        </div>}
      </section>

      <section className="ui-surface p-5 sm:p-7">
        <div className="mb-5"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Preferencias por tenant · {activeTenant.name}</p><h2 className="mt-1 text-lg font-black text-white">Qué quieres recibir</h2></div>
        {preferences !== null && <div className="grid gap-3 md:grid-cols-2">
          <PreferenceRow label="Correo electrónico" description="Canal principal para avisos de FinOps." value={preferences.emailEnabled} disabled={savingKey !== null} onChange={() => void toggle('emailEnabled')} />
          <PreferenceRow label="Telegram" description="Requiere un chat privado vinculado desde tu perfil." value={preferences.telegramEnabled} disabled={savingKey !== null} onChange={() => void toggle('telegramEnabled')} />
          <PreferenceRow label="Alertas operativas" description="Estado de ingesta y operación de la plataforma." value={preferences.operationalAlerts} disabled={savingKey !== null} onChange={() => void toggle('operationalAlerts')} />
          <PreferenceRow label="Recomendaciones" description="Nuevas oportunidades, planes y decisiones." value={preferences.recommendationAlerts} disabled={savingKey !== null} onChange={() => void toggle('recommendationAlerts')} />
          <PreferenceRow label="Alertas financieras" description="Presupuestos, ahorro y valor realizado." value={preferences.financialAlerts} disabled={savingKey !== null} onChange={() => void toggle('financialAlerts')} />
          <PreferenceRow label="Resúmenes ejecutivos" description="Resumen periódico del estado FinOps del tenant." value={preferences.executiveSummaries} disabled={savingKey !== null} onChange={() => void toggle('executiveSummaries')} />
        </div>}
      </section>

      {canManage && <>
        <section className="grid gap-4 md:grid-cols-2">
          <ChannelCard title="Telegram" icon="send" enabled={status?.telegram.enabled ?? false} detail={`${status?.telegram.activeLinks ?? 0} chats activos`} />
          <ChannelCard title="Correo SMTP" icon="mail" enabled={status?.email.enabled ?? false} detail={status?.email.smtpConfigured ? 'Credenciales cargadas' : 'Pendiente de configuración'} />
        </section>
        {status?.email.enabled === false && <p role="status" className="ui-surface px-5 py-4 text-sm leading-relaxed text-zinc-300">Configura <code>EMAIL_ADDRESS</code> y una contraseña de aplicación de Google en <code>EMAIL_PASSWORD</code>, en las variables privadas del servidor; no uses la contraseña habitual. Gmail y Google Workspace usan <code>smtp.gmail.com</code> automáticamente, también con dominio propio. Google requiere verificación en dos pasos y la política de Workspace puede bloquear las contraseñas de aplicación. Reinicia la API y el servicio de notificaciones después del cambio. No compartas ni pegues secretos aquí.</p>}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="ui-surface space-y-4 p-5">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Diagnóstico</p><h2 className="mt-1 text-lg font-black text-white">Probar canales</h2></div>
            <input value={emailTarget} onChange={(event) => setEmailTarget(event.target.value)} placeholder="correo destino" type="email" className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-tak-yellow" />
            <button type="button" onClick={() => void runAdminAction(async () => { const response = await sendOutboundTestMessage(token, { email: emailTarget.trim() || undefined }); setDeliveries(response.deliveries); }, 'Prueba de correo encolada.')} disabled={!status?.email.enabled} className="w-full rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:opacity-50">Encolar prueba de correo</button>
            <button type="button" onClick={() => void runAdminAction(async () => { await verifyEmailConfiguration(token); }, 'Conexión SMTP verificada.')} disabled={!status?.email.enabled} className="w-full rounded-lg border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-200 hover:border-tak-yellow disabled:opacity-50">Verificar SMTP</button>
            <button type="button" onClick={() => void runAdminAction(async () => { await verifyTelegramConfiguration(token); }, 'Bot de Telegram verificado.')} disabled={!status?.telegram.enabled} className="w-full rounded-lg border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-200 hover:border-tak-yellow disabled:opacity-50">Verificar bot Telegram</button>
            <p className="text-xs leading-relaxed text-zinc-500">Las pruebas se registran en la cola y en la auditoría. El worker las entrega respetando límites y reintentos.</p>
          </div>
          <div className="ui-surface p-5">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Telegram</p><h2 className="mt-1 text-lg font-black text-white">Chats vinculados</h2></div><span className="text-xs text-zinc-500">Vinculación en Perfil</span></div>
            {links.length === 0 ? <p className="text-sm text-zinc-500">No hay chats vinculados en este tenant.</p> : <div className="space-y-2">{links.map((link) => <div key={link.id} className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{link.user?.name ?? link.user?.email ?? link.userId}</p><p className="text-xs text-zinc-500">{link.status === 'ACTIVE' ? 'Activo' : 'Desactivado'} · chat {link.chatId}</p></div><div className="flex gap-2"><button type="button" onClick={() => void runAdminAction(async () => { await sendTelegramTestMessage(token, link.id); }, 'Prueba de Telegram encolada.')} disabled={link.status !== 'ACTIVE'} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white disabled:opacity-50">Probar</button><button type="button" onClick={() => void runAdminAction(async () => { await disableTelegramLink(token, link.id); }, 'Vínculo desactivado.')} disabled={link.status !== 'ACTIVE'} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-50">Desactivar</button></div></div>)}</div>}
          </div>
        </section>
        <DeliveryList deliveries={deliveries} />
      </>}
    </div>
  );
}

function PreferenceRow({ label, description, value, disabled, onChange }: { readonly label: string; readonly description: string; readonly value: boolean; readonly disabled: boolean; readonly onChange: () => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="min-w-0"><p className="text-sm font-black text-white">{label}</p><p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p></div><button type="button" aria-label={label} aria-pressed={value} onClick={onChange} disabled={disabled} className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? 'bg-tak-yellow' : 'bg-zinc-700'} disabled:opacity-50`}><span className={`absolute top-1 size-4 rounded-full bg-zinc-950 transition ${value ? 'left-6' : 'left-1'}`} /></button></div>;
}

function ChannelCard({ title, icon, enabled, detail }: { readonly title: string; readonly icon: string; readonly enabled: boolean; readonly detail: string }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"><div className="flex items-center gap-3"><span className="material-symbols-outlined text-tak-yellow">{icon}</span><div><h2 className="text-sm font-black text-white">{title}</h2><p className="text-xs text-zinc-500">{detail}</p></div><span className={`ml-auto rounded-full px-2 py-1 text-[10px] font-black uppercase ${enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>{enabled ? 'Activo' : 'Inactivo'}</span></div></div>;
}

function DeliveryList({ deliveries }: { readonly deliveries: readonly OutboundMessageDelivery[] }) {
  return <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"><div className="border-b border-zinc-800 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Trazabilidad</p><h2 className="mt-1 text-lg font-black text-white">Entregas recientes</h2></div>{deliveries.length === 0 ? <p className="p-5 text-sm text-zinc-500">Aún no hay entregas registradas.</p> : <div className="divide-y divide-zinc-800">{deliveries.map((delivery) => <div key={delivery.id} className="grid gap-2 p-4 text-xs sm:grid-cols-[100px_1fr_110px_140px] sm:items-center"><span className="font-black text-white">{delivery.channel}</span><span className="truncate text-zinc-400" title={delivery.errorMessage ?? delivery.preview}>{delivery.errorMessage ?? delivery.preview}</span><span className={delivery.status === 'SENT' ? 'text-emerald-300' : delivery.status === 'FAILED' ? 'text-red-300' : 'text-yellow-300'}>{delivery.status}</span><span className="text-zinc-500">{new Date(delivery.createdAt).toLocaleString('es-CO')}</span></div>)}</div>}</section>;
}
