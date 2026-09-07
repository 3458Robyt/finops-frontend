import { useMemo, useState } from 'react';
import { acceptClientInvitation, type AuthSession } from '../services/api';

interface ClientInvitationAcceptProps {
  readonly code: string;
  readonly onAccepted: (session: AuthSession) => void;
}

export default function ClientInvitationAccept({ code, onAccepted }: ClientInvitationAcceptProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const tenantSlug = useMemo(() => {
    const segment = window.location.pathname.split('/').filter(Boolean).pop();
    return segment === undefined ? 'cliente' : decodeURIComponent(segment);
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await acceptClientInvitation(code, name, password);
      if ('mfaRequired' in result) {
        setError('La cuenta fue creada, pero requiere MFA. Inicia sesión desde la pantalla principal.');
        setAccepted(true);
        return;
      }
      onAccepted(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible aceptar la invitación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="auth-shell flex min-h-screen items-center justify-center px-4 text-zinc-100">
      <section className="auth-card w-full max-w-md p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-tak-yellow text-zinc-950">
            <span className="material-symbols-outlined font-bold">cloud_done</span>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-tak-yellow">FinOps Intelligence</p>
            <h1 className="text-xl font-black text-white">Acceso de cliente</h1>
          </div>
        </div>
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">
          Esta invitación te habilita el portal de <strong className="text-zinc-200">{tenantSlug}</strong>. El código es de un solo uso y expira en 30 minutos.
        </p>
        {accepted ? (
          <div className="ui-alert-positive p-4 text-sm font-bold">
            Cuenta creada. Ya puedes volver al inicio e iniciar sesión.
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <label className="block text-sm font-bold text-zinc-300">Nombre completo<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-tak-yellow" /></label>
            <label className="block text-sm font-bold text-zinc-300">Contraseña<input required minLength={12} maxLength={128} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-tak-yellow" /></label>
            <label className="block text-sm font-bold text-zinc-300">Confirmar contraseña<input required minLength={12} maxLength={128} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-tak-yellow" /></label>
            {error !== null && <p className="ui-alert-danger p-3 text-sm font-bold">{error}</p>}
            <button type="submit" disabled={saving} className="ui-button ui-button-primary w-full">
              {saving ? 'Activando acceso…' : 'Crear acceso de cliente'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
