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
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
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
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">
            Cuenta creada. Ya puedes volver al inicio e iniciar sesión.
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <label className="block text-sm font-bold text-zinc-300">Nombre completo<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-tak-yellow" /></label>
            <label className="block text-sm font-bold text-zinc-300">Contraseña<input required minLength={12} maxLength={128} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-tak-yellow" /></label>
            <label className="block text-sm font-bold text-zinc-300">Confirmar contraseña<input required minLength={12} maxLength={128} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-tak-yellow" /></label>
            {error !== null && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-tak-yellow px-4 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-300 disabled:opacity-60">
              {saving ? 'Activando acceso…' : 'Crear acceso de cliente'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
