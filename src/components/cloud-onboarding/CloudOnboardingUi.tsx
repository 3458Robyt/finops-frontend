import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { CloudCredentialSummary } from '../../services/api';
import { HelpTooltip } from './HelpTooltip';

export const inputClass = 'mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-tak-yellow disabled:opacity-50';
export const primaryButton = 'w-full rounded-xl bg-tak-yellow px-4 py-2.5 text-sm font-black text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButton = 'rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-zinc-200 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50';

export function Field({ label, help, children }: { readonly label: string; readonly help?: string; readonly children: ReactNode }) {
  return <div className="block text-xs font-bold uppercase tracking-wider text-zinc-500"><span className="flex items-center gap-2"><span>{label}</span>{help !== undefined && <HelpTooltip label={`Ayuda: ${label}`}>{help}</HelpTooltip>}</span>{Children.map(children, (child) => isValidElement(child) && isFormControl(child) ? cloneElement(child as ReactElement<{ readonly 'aria-label'?: string }>, { 'aria-label': label }) : child)}</div>;
}

function isFormControl(child: ReactNode): child is ReactElement {
  return isValidElement(child) && (child.type === 'input' || child.type === 'select' || child.type === 'textarea');
}

export function Badge({ text, tone }: { readonly text: string; readonly tone: 'green' | 'yellow' | 'red' }) {
  const style = tone === 'green' ? 'bg-green-500/15 text-green-300' : tone === 'red' ? 'bg-red-500/15 text-red-300' : 'bg-tak-yellow/15 text-tak-yellow';
  return <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${style}`}>{text}</span>;
}

export function Empty({ text }: { readonly text: string }) {
  return <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">{text}</div>;
}

export function OnboardingStep({ number, title, complete, active }: { readonly number: string; readonly title: string; readonly complete: boolean; readonly active: boolean }) {
  const tone = complete ? 'border-green-500/40 bg-green-500/10 text-green-300' : active ? 'border-tak-yellow/50 bg-tak-yellow/10 text-tak-yellow' : 'border-zinc-800 bg-zinc-950/40 text-zinc-500';
  return <li className={`rounded-xl border px-3 py-2 text-xs font-bold ${tone}`}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-[10px]">{complete ? '✓' : number}</span>{title}</li>;
}

export function CredentialRow({
  credential,
  canManage,
  busy,
  onRevoke,
  onRetry,
}: {
  readonly credential: CloudCredentialSummary;
  readonly canManage: boolean;
  readonly busy: string | null;
  readonly onRevoke: () => void;
  readonly onRetry: () => void;
}) {
  const retryable = credential.status === 'PENDING' || credential.status === 'INVALID';
  const statusLabel = credential.status === 'ACTIVE' ? 'Activa' : credential.status === 'PENDING' ? 'Pendiente' : credential.status === 'INVALID' ? 'Rechazada' : credential.status;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-200">{credential.label}</p>
        <p className="text-xs text-zinc-500">{credential.purpose} · {statusLabel}{credential.externalPrincipalId ? ` · ${credential.externalPrincipalId}` : ''}</p>
        {credential.keyFingerprint && <p className="mt-1 break-all font-mono text-[11px] text-zinc-600">Fingerprint: {credential.keyFingerprint}</p>}
        {credential.validationMessage && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-amber-300">{credential.validationMessage}</p>}
      </div>
      {canManage && <div className="flex flex-wrap gap-3">
        {retryable && <button type="button" disabled={busy !== null} onClick={onRetry} className="text-xs font-bold text-tak-yellow hover:text-yellow-200">{busy?.startsWith(`credential-${credential.id}`) ? 'Validando…' : 'Reintentar validación'}</button>}
        {credential.status === 'ACTIVE' && <button type="button" disabled={busy !== null} onClick={onRevoke} className="text-xs font-bold text-red-300 hover:text-red-200">Revocar</button>}
      </div>}
    </div>
  );
}
