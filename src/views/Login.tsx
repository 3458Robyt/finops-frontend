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
      <div className="auth-shell grid-cols-1 place-items-center p-4">
        <form onSubmit={handlePasswordReset} className="auth-card space-y-5 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-black text-white">Restablecer contraseña</h1>
            <p className="mt-2 text-sm text-zinc-400">Crea una contraseña nueva para tu cuenta.</p>
          </div>
          <input type="password" minLength={12} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="Nueva contraseña" required className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white focus:border-tak-yellow focus:outline-none" />
          <input type="password" minLength={12} value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)} placeholder="Repite la contraseña" required className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white focus:border-tak-yellow focus:outline-none" />
          {error !== null && <div className="ui-alert-danger px-4 py-3 text-xs font-bold">{error}</div>}
          {recoveryMessage !== null && <div className="ui-alert-positive px-4 py-3 text-xs font-bold">{recoveryMessage}</div>}
          <button type="submit" disabled={loading} className="ui-button ui-button-primary w-full">{loading ? 'Guardando…' : 'Actualizar contraseña'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-shell lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="auth-brand-panel hidden lg:flex">
        <div className="relative z-10 max-w-xl">
          <p className="ui-kicker">TAK Colombia · FinOps Inteligente</p>
          <h1 className="mt-5 max-w-lg font-display text-6xl font-bold leading-[0.92] tracking-tight text-white">Decisiones cloud con evidencia.</h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-400">Costos, consumo y decisiones operativas reunidos en un mismo centro de control.</p>
          <div className="mt-10 grid max-w-md grid-cols-3 border-y border-zinc-800 py-4 text-xs text-zinc-500">
            <span>Costos</span><span className="border-l border-zinc-800 pl-3">Consumo</span><span className="border-l border-zinc-800 pl-3">Gobierno</span>
          </div>
        </div>
      </section>

      <div className="auth-form-panel">
        <div className="auth-card p-6 sm:p-8">
          <div className="mb-8 flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded bg-tak-yellow">
              <span className="material-symbols-outlined text-2xl font-bold text-zinc-950">query_stats</span>
            </div>
            <div>
              <p className="ui-kicker">Portal corporativo</p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">FinOps Inteligente</h1>
              <p className="mt-1 text-sm font-medium text-zinc-400">Ingresa al centro de control TAK.</p>
            </div>
          </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="auth-label ml-1">Usuario / email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">person</span>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ui-control auth-input pl-10 pr-4 focus:ring-1 focus:ring-tak-yellow"
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="auth-label ml-1">Contraseña</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">lock</span>
              <input 
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ui-control auth-input pl-10 pr-4 focus:ring-1 focus:ring-tak-yellow"
                required 
              />
            </div>
          </div>

          {mfaChallenge !== null && (
            <div className="ui-callout ui-callout-accent space-y-3 p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-tak-yellow">Verificación MFA</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {useRecoveryCode ? 'Usa uno de tus códigos de recuperación de un solo uso.' : 'El acceso requiere un código temporal de seis dígitos.'}
                </p>
              </div>
              {mfaChallenge.mfaSetupRequired === true && (
                <div className="ui-callout space-y-3 bg-zinc-950/70 p-3 text-center">
                  {mfaQrCode !== null && <img src={mfaQrCode} alt="Código QR para configurar MFA" className="mx-auto rounded bg-white p-2" width={240} height={240} />}
                  {mfaQrCode === null && !mfaQrError && <p className="text-xs text-zinc-400">Generando código QR…</p>}
                  {mfaQrError && <p className="text-xs text-red-300">No se pudo generar el código QR. Usa la configuración manual.</p>}
                  {mfaQrCode !== null && <p className="text-xs text-zinc-400">Escanea este código desde tu aplicación autenticadora.</p>}
                  {mfaChallenge.secret !== undefined && (
                    <details className="text-left text-xs text-zinc-300">
                      <summary className="cursor-pointer text-tak-yellow">¿No puedes escanear? Usar clave manual</summary>
                      <code className="ui-code mt-2 block break-all rounded bg-zinc-900 px-2 py-2 text-tak-yellow">{mfaChallenge.secret}</code>
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
                className={`ui-control w-full px-4 py-3 text-center text-xl text-white focus:border-tak-yellow ${useRecoveryCode ? 'tracking-wider' : 'tracking-[0.4em]'}`}
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
              <div className="flex h-4 w-4 items-center justify-center rounded border border-zinc-700 bg-zinc-950 peer-checked:border-tak-yellow peer-checked:bg-tak-yellow transition-colors">
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
            <div className="ui-alert-positive px-4 py-3 text-xs font-bold">
              {recoveryMessage}
            </div>
          )}

          {error !== null && (
            <div className="ui-alert-danger px-4 py-3 text-xs font-bold">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="ui-button ui-button-primary w-full py-4 disabled:cursor-not-allowed disabled:opacity-70"
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
      </div>

      <div className="auth-footer text-xs font-medium">
        &copy; {new Date().getFullYear()} TAK Colombia. Todos los derechos reservados.
      </div>
    </div>
  );
}
