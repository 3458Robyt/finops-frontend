import { useEffect, useState } from 'react';
import { fetchMfaStatus, regenerateMfaRecoveryCodes } from '../../services/api';
import MfaRecoveryCodesDialog from './MfaRecoveryCodesDialog';

export default function MfaSecurityPanel({ token }: { readonly token: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<readonly string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMfaStatus(token)
      .then((status) => {
        if (!cancelled) {
          setEnabled(status.enabled);
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
      {enabled && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Código MFA actual" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-tak-yellow focus:outline-none" />
          <button type="button" disabled={loading} onClick={() => void regenerate()} className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-black uppercase text-zinc-200 disabled:opacity-50">
            {loading ? 'Regenerando…' : 'Regenerar códigos'}
          </button>
        </div>
      )}
      {error !== null && <p className="text-xs text-red-400">{error}</p>}
      {codes !== null && <MfaRecoveryCodesDialog codes={codes} onClose={() => setCodes(null)} />}
    </div>
  );
}
