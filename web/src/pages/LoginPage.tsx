import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Logo } from '../components/ui/Logo';
import { Mail, Lock, ShieldCheck, Video, VideoOff } from 'lucide-react';
import { APP_VERSION, BUILD_DATE } from '../components/layout/Sidebar';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVideoActive, setIsVideoActive] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login({ email, password });
      navigate('/');
    } catch {
      setError('Credenciales inválidas o error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isVideoActive) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
    setIsVideoActive(!isVideoActive);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950 select-none">
      {/* Background Video Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {isVideoActive ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            poster="https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1920&q=80"
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-700 opacity-90"
          >
            <source
              src="https://assets.mixkit.co/videos/preview/mixkit-excavator-working-on-a-construction-site-41584-large.mp4"
              type="video/mp4"
            />
          </video>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        )}
      </div>

      {/* Cinematic Contrast Overlay (75% darkness + subtle blur) */}
      <div className="absolute inset-0 z-10 bg-slate-950/75 backdrop-blur-[2px] transition-all" />

      {/* Foreground Login Card */}
      <Card className="relative z-20 w-full max-w-md shadow-2xl border border-white/10 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Brand Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-blue-600" />

        <CardHeader className="text-center pb-2 pt-6 flex flex-col items-center">
          <div className="mb-3">
            <Logo size="lg" variant="full" />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Acceso al Sistema
          </CardTitle>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Gestión Integral de Maquinarias, Mantenimiento y Faenas
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-3">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 p-3 rounded-xl text-xs border border-red-200 dark:border-red-900/60 font-medium">
                {error}
              </div>
            )}

            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="usuario@sgmt.local"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 focus:ring-0"
                />
                <span>Recordar sesión</span>
              </label>
              <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                ¿Olvidaste tu contraseña?
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-6">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-600/20 text-sm"
              isLoading={isLoading}
            >
              Ingresar al Sistema
            </Button>

            {/* Footer Security Badge */}
            <div className="w-full flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>SGMT PRO {APP_VERSION}</span>
              </span>
              <span>Build {BUILD_DATE}</span>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Video Background Toggle Button (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={toggleVideo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-slate-300 text-xs backdrop-blur-md border border-slate-700/60 transition-colors shadow-lg"
          title={isVideoActive ? 'Desactivar video de fondo' : 'Activar video de fondo'}
        >
          {isVideoActive ? (
            <>
              <VideoOff size={13} className="text-amber-400" />
              <span>Pausar Video</span>
            </>
          ) : (
            <>
              <Video size={13} className="text-blue-400" />
              <span>Fondo Animado</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
