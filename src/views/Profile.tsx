import { useState } from 'react';
import type { ApiUser } from '../services/api';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
}

export default function Profile({ onLogout, currentRole, user }: { onLogout: () => void, currentRole: 'admin' | 'client', user: ApiUser }) {
const [twoFactor, setTwoFactor] = useState(true);
const [notifications, setNotifications] = useState(true);
const [persistent, setPersistent] = useState(false);
const displayName = user.name.trim() !== '' ? user.name : user.email;
const initials = displayName
.split(/\s+/)
.filter(Boolean)
.slice(0, 2)
.map((part) => part[0]?.toUpperCase() ?? '')
.join('') || user.email.slice(0, 2).toUpperCase();

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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-zinc-100 uppercase tracking-tight">Autenticación 2FA</p>
                  <p className="text-xs text-zinc-500 mt-1">Añade una capa extra de seguridad.</p>
                </div>
                <Toggle checked={twoFactor} onChange={() => setTwoFactor(!twoFactor)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-zinc-100 uppercase tracking-tight">Recordatorios de ahorro</p>
                  <p className="text-xs text-zinc-500 mt-1">Avisos in-app sobre oportunidades y ahorro no capturado.</p>
                </div>
                <Toggle checked={notifications} onChange={() => setNotifications(!notifications)} />
              </div>
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
            <div className="flex items-start gap-4 p-4 bg-zinc-950 rounded-2xl border border-zinc-800/50">
              <div className="size-10 bg-tak-yellow/10 flex items-center justify-center rounded-xl shrink-0">
                <span className="material-symbols-outlined text-tak-yellow">laptop_mac</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">MacBook Pro - Bogotá, CO</p>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase">Chrome • En línea ahora</p>
              </div>
              <span className="size-2 rounded-full bg-green-500 animate-pulse mt-1"></span>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/30">
              <div className="size-10 bg-zinc-800 flex items-center justify-center rounded-xl shrink-0 text-zinc-400">
                <span className="material-symbols-outlined">smartphone</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-zinc-400">iPhone 15 - Bogotá, CO</p>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase">App TAK • Hace 2 horas</p>
              </div>
            </div>
            
            <div className="pt-2">
              <button className="text-xs font-bold text-tak-yellow/80 hover:text-tak-yellow transition-colors uppercase tracking-widest flex items-center gap-1">
                Ver todo el historial de acceso
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
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
