import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { beginMfaSetup, confirmMfaSetup } from '../../services/api';
import { useAccessToken } from '../../auth/authSession';
import MfaRecoveryCodesDialog from './MfaRecoveryCodesDialog';

interface Props {
  readonly onCompleted: () => void;
  readonly onCancel: () => void;
}

export default function MfaSetupFlow({ onCompleted, onCancel }: Props) {
  const token = useAccessToken();
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<readonly string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void beginMfaSetup(token)
      .then((response) => {
        if (cancelled) return;
        setSecret(response.secret);
        setOtpauthUri(response.otpauthUri);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'No fue posible iniciar la configuración MFA.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (otpauthUri === null) {
      setQrCode(null);
      return undefined;
    }
    let cancelled = false;
    void QRCode.toDataURL(otpauthUri, { width: 220, margin: 2, errorCorrectionLevel: 'M' })
      .then((dataUrl) => { if (!cancelled) setQrCode(dataUrl); })
      .catch(() => { if (!cancelled) setError('No se pudo generar el código QR. Usa la clave manual.'); });
    return () => { cancelled = true; };
  }, [otpauthUri]);

  const confirm = async (): Promise<void> => {
    if (!/^\d{6}$/.test(code)) {
      setError('Escribe el código de seis dígitos que muestra tu autenticador.');
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const response = await confirmMfaSetup(token, code);
      setRecoveryCodes(response.recoveryCodes);
      setCode('');
      onCompleted();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible activar MFA.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-tak-yellow/30 bg-tak-yellow/5 p-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-tak-yellow">Activar MFA</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">Escanea el QR con Google Authenticator, Microsoft Authenticator o la aplicación equivalente. Después confirma el código actual.</p>
      </div>
      {loading && <p className="text-xs text-zinc-400">Generando configuración segura…</p>}
      {qrCode !== null && <div className="flex justify-center rounded-xl bg-white p-3"><img src={qrCode} alt="Código QR para configurar MFA" className="size-52" /></div>}
      {secret !== null && <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Clave manual</p><code className="mt-2 block break-all text-sm font-bold tracking-wider text-tak-yellow">{secret}</code></div>}
      {otpauthUri !== null && <details className="text-xs text-zinc-500"><summary className="cursor-pointer font-bold text-zinc-300">Ver URI de configuración</summary><code className="mt-2 block break-all rounded-lg bg-zinc-950 p-2">{otpauthUri}</code></details>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Código de seis dígitos" aria-label="Código MFA de confirmación" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-center text-sm tracking-[0.35em] text-white focus:border-tak-yellow focus:outline-none" />
        <button type="button" disabled={loading || confirming || secret === null} onClick={() => void confirm()} className="ui-button ui-button-primary whitespace-nowrap text-xs">{confirming ? 'Activando…' : 'Confirmar activación'}</button>
        <button type="button" disabled={confirming} onClick={onCancel} className="ui-button ui-button-secondary text-xs">Cancelar</button>
      </div>
      {error !== null && <p className="text-xs text-red-300" role="alert">{error}</p>}
      {recoveryCodes !== null && <MfaRecoveryCodesDialog codes={recoveryCodes} onClose={() => { setRecoveryCodes(null); onCancel(); }} />}
    </div>
  );
}
