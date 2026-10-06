import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { confirmMfaSetup } from '../../services/api';
import MfaRecoveryCodesDialog from './MfaRecoveryCodesDialog';

interface Props {
  readonly token: string;
  readonly secret: string;
  readonly otpauthUri: string;
  readonly onCompleted: () => void;
  readonly onCancel: () => void;
}

export default function MfaSetupFlow({ token, secret, otpauthUri, onCompleted, onCancel }: Props) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<readonly string[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      {qrCode === null && <p className="text-xs text-zinc-400">Generando código QR…</p>}
      {qrCode !== null && <div className="flex justify-center rounded-xl bg-white p-3"><img src={qrCode} alt="Código QR para configurar MFA" className="size-52" /></div>}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Clave manual</p><code className="mt-2 block break-all text-sm font-bold tracking-wider text-tak-yellow">{secret}</code></div>
      <details className="text-xs text-zinc-500"><summary className="cursor-pointer font-bold text-zinc-300">Ver URI de configuración</summary><code className="mt-2 block break-all rounded-lg bg-zinc-950 p-2">{otpauthUri}</code></details>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Código de seis dígitos" aria-label="Código MFA de confirmación" className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-center text-sm tracking-[0.35em] text-white focus:border-tak-yellow focus:outline-none" />
        <button type="button" disabled={confirming} onClick={() => void confirm()} className="ui-button ui-button-primary whitespace-nowrap text-xs">{confirming ? 'Activando…' : 'Confirmar activación'}</button>
        <button type="button" disabled={confirming} onClick={onCancel} className="ui-button ui-button-secondary text-xs">Cancelar</button>
      </div>
      {error !== null && <p className="text-xs text-red-300" role="alert">{error}</p>}
      {recoveryCodes !== null && <MfaRecoveryCodesDialog codes={recoveryCodes} onClose={() => { setRecoveryCodes(null); onCancel(); }} />}
    </div>
  );
}
