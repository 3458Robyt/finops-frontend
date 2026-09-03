import QRCode from 'qrcode';
import { useEffect, useState, type FormEvent } from 'react';
import { confirmPasswordReset, requestPasswordReset, type AuthLoginResponse } from '../services/api';

export default function Login({ onLogin }: {
  readonly onLogin: (
    email: string,
    password: string,
    mfa?: { readonly challengeToken: string; readonly code: string; readonly enrollment: boolean },
  ) => Promise<AuthLoginResponse>;
}) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState<Extract<AuthLoginResponse, { readonly mfaRequired: true }> | null>(null);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaQrError, setMfaQrError] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resetToken = new URLSearchParams(window.location.search).get('token');

  useEffect(() => {
    const otpauthUri = mfaChallenge?.mfaSetupRequired === true ? mfaChallenge.otpauthUri : undefined;
    if (otpauthUri === undefined) {
      setMfaQrCode(null);
      setMfaQrError(false);
      return;
    }

    let cancelled = false;
    setMfaQrCode(null);
    setMfaQrError(false);
    void QRCode.toDataURL(otpauthUri, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then((dataUrl) => {
        if (!cancelled) setMfaQrCode(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setMfaQrError(true);
      });
    return () => { cancelled = true; };
  }, [mfaChallenge]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await onLogin(
        email,
        password,
        mfaChallenge === null ? undefined : {
          challengeToken: mfaChallenge.challengeToken,
          code: mfaCode,
          enrollment: mfaChallenge.mfaSetupRequired === true,
        },
      );
      if ('mfaRequired' in result) {
        setMfaChallenge(result);
        setMfaCode('');
        setUseRecoveryCode(false);
        setRecoveryMessage(result.mfaSetupRequired === true
          ? 'Configura MFA con la clave o URI proporcionada y confirma un código de seis dígitos.'
          : 'Escribe el código de seis dígitos de tu aplicación autenticadora.');
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No fue posible iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    setLoading(true);
    setError(null);
    setRecoveryMessage(null);
    try {
      await requestPasswordReset(email);
      setRecoveryMessage('Si el correo existe, recibirás instrucciones para restablecer la contraseña.');
    } catch (recoveryError) {
      setError(recoveryError instanceof Error ? recoveryError.message : 'No fue posible solicitar el restablecimiento.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (event: FormEvent) => {
    event.preventDefault();
    if (resetToken === null || resetPassword !== resetConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await confirmPasswordReset(resetToken, resetPassword);
      window.history.replaceState({}, '', window.location.pathname);
      setRecoveryMessage('Contraseña actualizada. Ya puedes iniciar sesión.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'El enlace no es válido o expiró.');
    } finally {
      setLoading(false);
    }
  };

  if (resetToken !== null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <form onSubmit={handlePasswordReset} className="w-full max-w-md space-y-5 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          <div>
            <h1 className="text-2xl font-black text-white">Restablecer contraseña</h1>
            <p className="mt-2 text-sm text-zinc-400">Crea una contraseña nueva para tu cuenta.</p>
          </div>
          <input type="password" minLength={12} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="Nueva contraseña" required className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white focus:border-tak-yellow focus:outline-none" />
          <input type="password" minLength={12} value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} placeholder="Repite la contraseña" required className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white focus:border-tak-yellow focus:outline-none" />
          {error !== null && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">{error}</div>}
          {recoveryMessage !== null && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300">{recoveryMessage}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-tak-yellow py-4 text-sm font-bold uppercase tracking-widest text-zinc-950 disabled:opacity-70">{loading ? 'Guardando…' : 'Actualizar contraseña'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-tak-yellow/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 bg-tak-yellow flex items-center justify-center rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.2)] mb-4">
            <span className="material-symbols-outlined text-zinc-950 text-4xl font-bold">query_stats</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">FinOps Inteligente</h1>
          <p className="text-sm text-zinc-400 font-medium">FinOps Demo - Portal Corporativo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Usuario / Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">person</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-tak-yellow focus:ring-1 focus:ring-tak-yellow transition-all" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Contraseña</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">lock</span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-tak-yellow focus:ring-1 focus:ring-tak-yellow transition-all" 
                required 
              />
            </div>
          </div>

          {mfaChallenge !== null && (
            <div className="space-y-3 rounded-xl border border-tak-yellow/30 bg-tak-yellow/5 p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-tak-yellow">Verificación MFA</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {useRecoveryCode ? 'Usa uno de tus códigos de recuperación de un solo uso.' : 'El acceso requiere un código temporal de seis dígitos.'}
                </p>
              </div>
              {mfaChallenge.mfaSetupRequired === true && (
                <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-center">
                  {mfaQrCode !== null && <img src={mfaQrCode} alt="Código QR para configurar MFA" className="mx-auto rounded bg-white p-2" width={240} height={240} />}
                  {mfaQrCode === null && !mfaQrError && <p className="text-xs text-zinc-400">Generando código QR…</p>}
                  {mfaQrError && <p className="text-xs text-red-300">No se pudo generar el código QR. Usa la configuración manual.</p>}
                  {mfaQrCode !== null && <p className="text-xs text-zinc-400">Escanea este código desde tu aplicación autenticadora.</p>}
                  {mfaChallenge.secret !== undefined && (
                    <details className="text-left text-xs text-zinc-300">
                      <summary className="cursor-pointer text-tak-yellow">¿No puedes escanear? Usar clave manual</summary>
                      <code className="mt-2 block break-all rounded bg-zinc-900 px-2 py-2 text-tak-yellow">{mfaChallenge.secret}</code>
                    </details>
                  )}
                </div>
              )}
              <input
                inputMode={useRecoveryCode ? 'text' : 'numeric'}
                pattern={useRecoveryCode ? '[A-Fa-f0-9-]{20,23}' : '[0-9]{6}'}
                maxLength={useRecoveryCode ? 23 : 6}
                value={mfaCode}
                onChange={(event) => setMfaCode(useRecoveryCode
                  ? event.target.value.toUpperCase().replace(/[^A-F0-9-]/g, '').slice(0, 23)
                  : event.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center text-xl text-white focus:border-tak-yellow focus:outline-none ${useRecoveryCode ? 'tracking-wider' : 'tracking-[0.4em]'}`}
                placeholder={useRecoveryCode ? 'XXXXX-XXXXX-XXXXX-XXXXX' : '000000'}
                required
              />
              {mfaChallenge.mfaSetupRequired !== true && (
                <button type="button" onClick={() => { setUseRecoveryCode((current) => !current); setMfaCode(''); }} className="text-xs font-bold text-tak-yellow hover:underline">
                  {useRecoveryCode ? 'Usar aplicación autenticadora' : 'Usar código de recuperación'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 pb-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative inline-block w-4 h-4">
                <input type="checkbox" className="peer absolute opacity-0 w-0 h-0" defaultChecked />
                <div className="w-4 h-4 border border-zinc-700 bg-zinc-950 rounded flex items-center justify-center peer-checked:bg-tak-yellow peer-checked:border-tak-yellow transition-colors">
                  <span className="material-symbols-outlined text-[12px] text-zinc-950 opacity-0 peer-checked:opacity-100 font-bold">check</span>
                </div>
              </div>
              <span className="text-xs text-zinc-400 group-hover:text-zinc-300">Mantener sesión activa</span>
            </label>
            <button type="button" onClick={handleRecovery} disabled={loading || email.trim() === ''} className="text-xs text-tak-yellow hover:underline disabled:opacity-50">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {recoveryMessage !== null && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300">
              {recoveryMessage}
            </div>
          )}

          {error !== null && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-tak-yellow hover:bg-yellow-400 text-zinc-950 font-bold text-sm py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(250,204,21,0.2)]"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin font-bold">progress_activity</span>
            ) : (
              <>
                Ingresar al Panel
                <span className="material-symbols-outlined font-bold text-xl">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="absolute bottom-8 text-xs text-zinc-600 font-medium">
        &copy; {new Date().getFullYear()} FinOps Demo. Todos los derechos reservados.
      </div>
    </div>
  );
}
