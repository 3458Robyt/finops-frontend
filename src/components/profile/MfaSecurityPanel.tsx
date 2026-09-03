import { useEffect, useState } from 'react';
import { useAccessToken } from '../../auth/authSession';
import { disableMfa, fetchMfaStatus, regenerateMfaRecoveryCodes } from '../../services/api';
import MfaRecoveryCodesDialog from './MfaRecoveryCodesDialog';

export default function MfaSecurityPanel() {
  const token = useAccessToken();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [requiredForRole, setRequiredForRole] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [code, setCode] = useState('');
  const [removeCode, setRemoveCode] = useState('');
  const [removeRequested, setRemoveRequested] = useState(false);
  const [codes, setCodes] = useState<readonly string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMfaStatus(token)
      .then((status) => {
        if (!cancelled) {
          setEnabled(status.enabled);
          setRequiredForRole(status.requiredForRole);
          setRemaining(status.recoveryCodesRemaining);
        }
      })
      .catch(() => { if (!cancelled) setError('No fue posible consultar el estado MFA.'); });
    return () => { cancelled = true; };
  }, [token]);

  const regenerate = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Escribe un código MFA vigente de seis dígitos.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await regenerateMfaRecoveryCodes(token, code);
      setCodes(response.recoveryCodes);
      setRemaining(response.recoveryCodes.length);
      setCode('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible regenerar los códigos.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!/^\d{6}$/.test(removeCode)) {
      setError('Escribe un código MFA vigente de seis dígitos para confirmar.');
      return;
    }
    setRemoving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await disableMfa(token, removeCode);
      setEnabled(false);
      setRemaining(0);
      setRemoveCode('');
      setRemoveRequested(false);
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo quitar MFA.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-tight text-zinc-100">Autenticación MFA</p>
          <p className="mt-1 text-xs text-zinc-500">
            {enabled === null ? 'Consultando estado…' : enabled ? `Activa · ${remaining} códigos disponibles` : 'No está activada para esta cuenta.'}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
          {enabled ? 'Protegida' : 'Pendiente'}
        </span>
      </div>
      {enabled && !removeRequested && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Código MFA actual" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-tak-yellow focus:outline-none" />
          <button type="button" disabled={loading} onClick={() => void regenerate()} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-black uppercase text-zinc-200 disabled:opacity-50">
            {loading ? 'Regenerando…' : 'Regenerar códigos'}
          </button>
          <button type="button" onClick={() => { setRemoveRequested(true); setError(null); setMessage(null); }} className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs font-black uppercase text-red-300 hover:bg-red-500/10">
            Quitar MFA
          </button>
        </div>
      )}
      {enabled && removeRequested && (
        <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-red-300">Confirmar eliminación</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">Esta acción elimina la configuración MFA y revoca todos los códigos de recuperación. Confirma con un código actual de tu aplicación autenticadora.</p>
            {requiredForRole && <p className="mt-2 text-xs leading-relaxed text-amber-300">Por tu rol, el próximo inicio de sesión puede solicitarte configurar MFA nuevamente.</p>}
          </div>
          <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={removeCode} onChange={(event) => setRemoveCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Código MFA actual" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-center text-sm tracking-[0.35em] text-white focus:border-red-400 focus:outline-none" />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={removing} onClick={() => { setRemoveRequested(false); setRemoveCode(''); setError(null); }} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-black uppercase text-zinc-300 disabled:opacity-50">Cancelar</button>
            <button type="button" disabled={removing} onClick={() => void remove()} className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-50">{removing ? 'Quitando…' : 'Confirmar y quitar'}</button>
          </div>
        </div>
      )}
      {error !== null && <p className="text-xs text-red-400">{error}</p>}
      {message !== null && <p className="text-xs text-emerald-300">{message}</p>}
      {codes !== null && <MfaRecoveryCodesDialog codes={codes} onClose={() => setCodes(null)} />}
    </div>
  );
}
