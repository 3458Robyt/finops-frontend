import type { OutboundChannelStatusResponse, OutboundMessageDelivery, TelegramChatLink } from '../../services/api';
import { AgentMetric, Input, SectionHeader, StatusBadge } from './AgentSettingsUi';

interface AgentSettingsChannelsProps {
  readonly canConfigureAgent: boolean;
  readonly saving: boolean;
  readonly outboundStatus: OutboundChannelStatusResponse['status'] | null;
  readonly activeTelegramLinks: number;
  readonly outboundDeliveries: readonly OutboundMessageDelivery[];
  readonly emailTestTarget: string;
  readonly telegramLinks: readonly TelegramChatLink[];
  readonly telegramForm: { readonly email: string; readonly chatId: string; readonly telegramUserId: string; readonly telegramUsername: string };
  readonly onEmailChange: (value: string) => void;
  readonly onSendEmail: () => void;
  readonly onTelegramFormChange: (form: { readonly email: string; readonly chatId: string; readonly telegramUserId: string; readonly telegramUsername: string }) => void;
  readonly onCreateTelegram: () => void;
  readonly onDisableTelegram: (linkId: string) => void;
  readonly onTestTelegram: (linkId: string) => void;
  readonly onSendSavingsReminders: () => void;
  readonly onSendRecommendationSummary: () => void;
  readonly onSendExecutiveSummary: () => void;
  readonly onBackfill: () => void;
}

export function AgentSettingsChannels(props: AgentSettingsChannelsProps) {
  const { canConfigureAgent, saving, outboundStatus, activeTelegramLinks, outboundDeliveries } = props;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <AgentMetric title="Telegram" value={outboundStatus?.telegram.enabled ? 'Activo' : 'Inactivo'} helper={`${activeTelegramLinks} chats activos`} icon="send" />
        <AgentMetric title="Correo SMTP" value={outboundStatus?.email.enabled ? 'Activo' : 'Inactivo'} helper={outboundStatus?.email.smtpConfigured ? 'Configurado' : 'Pendiente .env'} icon="mail" />
        <AgentMetric title="Permisos" value={canConfigureAgent ? 'Administracion' : 'Lectura'} helper="Agente IA" icon="admin_panel_settings" />
      </div>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <SectionHeader title="Envios manuales" eyebrow="Telegram y correo" icon="campaign" />
          {canConfigureAgent && <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={props.onSendSavingsReminders} disabled={saving} className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-200 hover:border-tak-yellow hover:text-tak-yellow disabled:opacity-60">Recordar ahorro pendiente</button>
            <button onClick={props.onSendRecommendationSummary} disabled={saving} className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-200 hover:border-tak-yellow hover:text-tak-yellow disabled:opacity-60">Enviar resumen IA</button>
            <button onClick={props.onSendExecutiveSummary} disabled={saving} className="rounded-lg border border-tak-yellow/50 px-4 py-3 text-sm font-black text-tak-yellow hover:bg-tak-yellow/10 disabled:opacity-60">Enviar resumen ejecutivo</button>
            <button onClick={props.onBackfill} disabled={saving} className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-black text-zinc-200 hover:border-tak-yellow hover:text-tak-yellow disabled:opacity-60">Reconstruir contexto</button>
          </div>}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">Los envios quedan auditados como entregas. El scheduler opcional usa las mismas rutas internas y puede activarse desde variables de entorno.</p>
      </section>

      {canConfigureAgent ? <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <EmailPanel email={props.emailTestTarget} saving={saving} onEmailChange={props.onEmailChange} onSend={props.onSendEmail} />
          <TelegramPanel links={props.telegramLinks} form={props.telegramForm} saving={saving} onFormChange={props.onTelegramFormChange} onCreate={props.onCreateTelegram} onDisable={props.onDisableTelegram} onTest={props.onTestTelegram} />
        </div>
        <DeliveryTable deliveries={outboundDeliveries} />
      </div> : <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-200">La gestion de canales externos esta reservada para administradores.</div>}
    </section>
  );
}

function EmailPanel({ email, saving, onEmailChange, onSend }: { readonly email: string; readonly saving: boolean; readonly onEmailChange: (value: string) => void; readonly onSend: () => void }) {
  return <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5"><SectionHeader title="Correo SMTP" eyebrow="Prueba manual" icon="mail" /><Input label="Email destino opcional" value={email} onChange={onEmailChange} /><button onClick={onSend} disabled={saving} className="w-full rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:opacity-60">Enviar prueba de correo</button></section>;
}

function TelegramPanel({ links, form, saving, onFormChange, onCreate, onDisable, onTest }: { readonly links: readonly TelegramChatLink[]; readonly form: AgentSettingsChannelsProps['telegramForm']; readonly saving: boolean; readonly onFormChange: AgentSettingsChannelsProps['onTelegramFormChange']; readonly onCreate: () => void; readonly onDisable: (linkId: string) => void; readonly onTest: (linkId: string) => void }) {
  return <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5"><SectionHeader title="Telegram" eyebrow="Vinculacion" icon="send" /><Input label="Email usuario FinOps" value={form.email} onChange={(value) => onFormChange({ ...form, email: value })} /><Input label="Chat ID" value={form.chatId} onChange={(value) => onFormChange({ ...form, chatId: value })} /><Input label="Telegram user ID" value={form.telegramUserId} onChange={(value) => onFormChange({ ...form, telegramUserId: value })} /><Input label="Username" value={form.telegramUsername} onChange={(value) => onFormChange({ ...form, telegramUsername: value })} /><button onClick={onCreate} disabled={saving} className="w-full rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:opacity-60">Vincular chat</button><div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">{links.length === 0 ? <p className="p-4 text-sm font-bold text-zinc-500">No hay chats de Telegram vinculados.</p> : links.map((link) => <article key={link.id} className="p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><p className="text-sm font-black text-white">{link.user?.email ?? link.userId}</p><p className="mt-1 break-all text-xs font-mono text-zinc-500">{link.chatId}</p><StatusBadge label={link.status} tone={link.status === 'ACTIVE' ? 'success' : 'warning'} /></div><div className="flex gap-2"><button onClick={() => onTest(link.id)} disabled={saving || link.status !== 'ACTIVE'} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-300 hover:text-white disabled:opacity-50">Probar</button><button onClick={() => onDisable(link.id)} disabled={saving || link.status !== 'ACTIVE'} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-400 hover:text-white disabled:opacity-50">Desactivar</button></div></div></article>)}</div></section>;
}

function DeliveryTable({ deliveries }: { readonly deliveries: readonly OutboundMessageDelivery[] }) {
  return <section className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60"><div className="border-b border-zinc-800 px-5 py-4"><SectionHeader title="Entregas recientes" eyebrow="Auditoria de mensajes" icon="receipt_long" /></div><div className="hidden grid-cols-[0.8fr_1fr_0.8fr_1.4fr_0.8fr] gap-3 border-b border-zinc-800 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 md:grid"><span>Canal</span><span>Tipo</span><span>Estado</span><span>Vista previa</span><span>Fecha</span></div>{deliveries.length === 0 ? <p className="px-4 py-6 text-sm font-bold text-zinc-500">Aun no hay entregas registradas.</p> : deliveries.map((delivery) => <div key={delivery.id} className="grid gap-2 border-b border-zinc-800 px-4 py-3 text-xs text-zinc-300 last:border-b-0 md:grid-cols-[0.8fr_1fr_0.8fr_1.4fr_0.8fr] md:gap-3"><span className="font-black text-white">{delivery.channel}</span><span>{delivery.messageType}</span><span className={delivery.status === 'SENT' ? 'text-emerald-300' : delivery.status === 'FAILED' ? 'text-red-300' : delivery.status === 'PROCESSING' ? 'text-sky-300' : 'text-yellow-300'}>{deliveryStatusLabel(delivery.status)}</span><span className="truncate" title={delivery.errorMessage ?? delivery.preview}>{delivery.errorMessage ?? delivery.preview}</span><span>{new Date(delivery.createdAt).toLocaleDateString('es-CO')}</span></div>)}</section>;
}

function deliveryStatusLabel(status: OutboundMessageDelivery['status']): string {
  return { PENDING: 'Pendiente', PROCESSING: 'En proceso', SENT: 'Enviada', FAILED: 'Fallida', SKIPPED: 'Omitida' }[status];
}
