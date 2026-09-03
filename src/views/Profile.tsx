import { useEffect, useState } from 'react';
import { useAccessToken } from '../auth/authSession';
import { createTelegramSelfLinkCode, fetchAuthSessions, revokeAuthSession, type ApiUser, type AuthSessionDevice, type TelegramSelfLinkCodeResponse } from '../services/api';
import MfaSecurityPanel from '../components/profile/MfaSecurityPanel';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
}

export default function Profile({ onLogout, onOpenMessaging, currentRole, user }: {
  onLogout: () => void | Promise<void>;
  onOpenMessaging?: () => void;
  currentRole: 'admin' | 'client';
  user: ApiUser;
}) {
  const token = useAccessToken();
const [persistent, setPersistent] = useState(false);
const [sessions, setSessions] = useState<readonly AuthSessionDevice[]>([]);
const [sessionError, setSessionError] = useState<string | null>(null);
const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
const [telegramCode, setTelegramCode] = useState<TelegramSelfLinkCodeResponse | null>(null);
const [telegramLoading, setTelegramLoading] = useState(false);
const [telegramError, setTelegramError] = useState<string | null>(null);
const [telegramCopied, setTelegramCopied] = useState(false);
const displayName = user.name.trim() !== '' ? user.name : user.email;
const initials = displayName
.split(/\s+/)
.filter(Boolean)
.slice(0, 2)
.map((part) => part[0]?.toUpperCase() ?? '')
.join('') || user.email.slice(0, 2).toUpperCase();

useEffect(() => {
  let cancelled = false;
  void fetchAuthSessions(token)
    .then((response) => {
      if (!cancelled) setSessions(response.sessions);
    })
    .catch(() => {
      if (!cancelled) setSessionError('No fue posible cargar las sesiones activas.');
    });
  return () => { cancelled = true; };
}, [token]);

const revokeSession = async (session: AuthSessionDevice) => {
  if (session.isCurrent) return;
  setRevokingSessionId(session.id);
  setSessionError(null);
  try {
    await revokeAuthSession(token, session.id);
    setSessions((current) => current.filter((item) => item.id !== session.id));
  } catch {
    setSessionError('No fue posible revocar esa sesión.');
  } finally {
    setRevokingSessionId(null);
  }
};

const generateTelegramCode = async () => {
  setTelegramLoading(true);
  setTelegramError(null);
  setTelegramCopied(false);
  try {
    const response = await createTelegramSelfLinkCode(token);
    setTelegramCode(response);
  } catch (error) {
    setTelegramError(error instanceof Error ? error.message : 'No fue posible generar el código de Telegram.');
  } finally {
    setTelegramLoading(false);
  }
};

const copyTelegramLink = async () => {
  if (telegramCode?.deepLink === undefined) return;
  try {
    await navigator.clipboard.writeText(telegramCode.deepLink);
    setTelegramCopied(true);
  } catch {
    setTelegramError('No fue posible copiar el enlace; usa el comando mostrado.');
  }
};

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <section className="bg-zinc-900 rounded-3xl p-6 lg:p-8 border border-zinc-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-tak-yellow/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-tak-yellow/10 transition-all"></div>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="relative">
            <div className="size-32 rounded-3xl border-2 border-zinc-800 shadow-2xl bg-zinc-800 flex items-center justify-center text-5xl font-black text-zinc-600">
              {initials}
            </div>
            <button className="absolute -bottom-2 -right-2 size-10 bg-tak-yellow text-zinc-950 rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl font-bold">photo_camera</span>
            </button>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <span className="inline-block bg-tak-yellow/10 text-tak-yellow text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest mb-2">
                {currentRole === 'admin' ? 'Administrador del Sistema' : 'Nivel de Acceso: Ejecutivo'}
              </span>
              <h2 className="text-3xl font-black text-white">
                {displayName}
              </h2>
              <p className="text-zinc-500 font-medium">
                {currentRole === 'admin' ? 'Admin de Cloud & FinOps Lead' : 'Lector Panel de Control'}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="material-symbols-outlined text-tak-yellow">mail</span>
                <span className="text-sm">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="material-symbols-outlined text-tak-yellow">location_on</span>
                <span className="text-sm">Bogotá, Colombia</span>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-auto flex flex-col gap-3">
            <button className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black rounded-xl transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">edit</span>
              Editar Perfil
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-tak-yellow">security</span>
            <h3 className="text-lg font-bold text-white">Seguridad y Acceso</h3>
          </div>
          <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <MfaSecurityPanel />
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-sky-400">send</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-100">Conectar Telegram</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">Genera un código de un solo uso y envíalo al bot con el comando <span className="font-mono text-zinc-300">/start código</span>.</p>
                    <button type="button" onClick={() => void generateTelegramCode()} disabled={telegramLoading} className="mt-3 rounded-lg border border-sky-500/30 px-3 py-2 text-xs font-black uppercase tracking-widest text-sky-300 hover:bg-sky-500/10 disabled:opacity-50">
                      {telegramLoading ? 'Generando…' : 'Generar código'}
                    </button>
                    {telegramCode !== null && <div className="mt-3 space-y-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                      {telegramCode.deepLink !== undefined && <div className="flex flex-wrap items-center gap-2"><a href={telegramCode.deepLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-sky-300 underline">Abrir bot</a><button type="button" onClick={() => void copyTelegramLink()} className="text-[10px] font-black uppercase text-zinc-400 hover:text-white">{telegramCopied ? 'Copiado' : 'Copiar enlace'}</button></div>}
                      <p className="break-all font-mono text-xs text-zinc-200">{telegramCode.startCommand}</p>
                      <p className="text-[10px] text-zinc-500">Expira: {new Date(telegramCode.expiresAt).toLocaleTimeString('es-CO')}</p>
                    </div>}
                    {telegramError !== null && <p className="mt-2 text-xs text-red-400">{telegramError}</p>}
                  </div>
                </div>
              </div>
              {onOpenMessaging !== undefined && <div className="flex items-center justify-between gap-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
                <div>
                  <p className="text-sm font-bold text-zinc-100 uppercase tracking-tight">Preferencias de mensajería</p>
                  <p className="text-xs text-zinc-500 mt-1">Configura correo, Telegram y los tipos de alertas desde el centro de Mensajería.</p>
                </div>
                <button type="button" onClick={onOpenMessaging} className="shrink-0 rounded-lg border border-sky-500/30 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-sky-300 hover:bg-sky-500/10">Abrir</button>
              </div>}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-zinc-100 uppercase tracking-tight">Sesión Persistente</p>
                  <p className="text-xs text-zinc-500 mt-1">Mantener sesión por 30 días.</p>
                </div>
                <Toggle checked={persistent} onChange={() => setPersistent(!persistent)} />
              </div>
            </div>

            <div className="pt-6 space-y-3">
              <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-black rounded-xl transition-all uppercase tracking-widest border border-zinc-700 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">lock_reset</span>
                Cambiar Contraseña
              </button>
              <button onClick={onLogout} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-black rounded-xl transition-all uppercase tracking-widest border border-red-500/20 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">logout</span>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
            <span className="material-symbols-outlined text-tak-yellow">history</span>
            <h3 className="text-lg font-bold text-white">Sesiones Activas</h3>
          </div>
          <div className="p-6 space-y-4">
            {sessionError !== null && <p className="text-xs text-red-400">{sessionError}</p>}
            {sessions.length === 0 && sessionError === null && <p className="text-xs text-zinc-500">No hay sesiones activas adicionales.</p>}
            {sessions.map((session) => (
              <div key={session.id} className={`flex items-start gap-4 p-4 rounded-2xl border ${session.isCurrent ? 'bg-zinc-950 border-zinc-800/50' : 'bg-zinc-950/50 border-zinc-800/30'}`}>
                <div className={`size-10 flex items-center justify-center rounded-xl shrink-0 ${session.isCurrent ? 'bg-tak-yellow/10 text-tak-yellow' : 'bg-zinc-800 text-zinc-400'}`}>
                  <span className="material-symbols-outlined">{session.isCurrent ? 'laptop_mac' : 'devices'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${session.isCurrent ? 'text-white' : 'text-zinc-400'}`}>{session.userAgent ?? 'Cliente desconocido'}</p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase">{session.isCurrent ? 'Sesión actual' : `IP ${session.ipAddress ?? 'no disponible'}`}</p>
                </div>
                {session.isCurrent ? <span className="size-2 rounded-full bg-green-500 animate-pulse mt-1" /> : <button onClick={() => void revokeSession(session)} disabled={revokingSessionId === session.id} className="text-[10px] font-black uppercase text-red-400 hover:text-red-300 disabled:opacity-50">Revocar</button>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in mt-1">
      <input 
        type="checkbox" 
        checked={checked}
        onChange={onChange}
        className="absolute block w-6 h-6 rounded-full bg-zinc-700 border-4 border-zinc-900 appearance-none cursor-pointer checked:right-0 checked:bg-tak-yellow checked:border-tak-yellow transition-all"
      />
      <label className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${checked ? 'bg-tak-yellow/20 border-tak-yellow/30' : 'bg-zinc-800 border-zinc-700 border'}`}></label>
    </div>
  );
}
