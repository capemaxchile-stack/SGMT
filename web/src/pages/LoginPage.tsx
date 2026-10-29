import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Logo } from '../components/ui/Logo';
import { api } from '../lib/axios';
import { Mail, Lock, ShieldCheck, Video, VideoOff, Eye, EyeOff, Smartphone, Building2 } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTerrainMode, setIsTerrainMode] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  // Detect subdomain (e.g. demo.katei.cl)
  const hostname = window.location.hostname;
  const isSubdomain = hostname.includes('.katei.cl') && !['app', 'www'].includes(hostname.split('.')[0]);
  const tenantSlug = isSubdomain ? hostname.split('.')[0] : null;

  // Animated Terrain & Ambient Particles Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle nodes for earthmoving / construction grid
    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; alpha: number }> = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    let t = 0;
    const render = () => {
      t += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Subtle Topographic Elevation Contour Lines
      ctx.lineWidth = 1;
      for (let layer = 1; layer <= 3; layer++) {
        ctx.beginPath();
        const baseOffset = height * (0.65 + layer * 0.1);
        ctx.strokeStyle = layer === 2 ? `rgba(34, 197, 94, ${0.14 - layer * 0.03})` : `rgba(245, 158, 11, ${0.12 - layer * 0.03})`;

        for (let x = 0; x <= width; x += 25) {
          const wave1 = Math.sin(x * 0.003 + t + layer) * 25;
          const wave2 = Math.cos(x * 0.005 - t * 0.6 + layer) * 15;
          const y = baseOffset + wave1 + wave2;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Floating Particle Nodes (Volumetric dust / quarry ambient motes)
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${p.alpha * 0.5})`; // Warm quarry glow
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login({ email, password });
      if (isTerrainMode) {
        navigate('/terreno');
      } else if (useAuthStore.getState().user?.roles?.includes('SUPER_USUARIO')) {
        navigate('/super-admin');
      } else {
        navigate('/');
      }
    } catch {
      setError('Credenciales inválidas o error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess('Si el correo existe en el sistema, recibirás un enlace seguro para restablecer tu contraseña.');
    } catch {
      setForgotError('No se pudo procesar la solicitud. Verifica el correo e intenta nuevamente.');
    } finally {
      setIsForgotLoading(false);
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
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#070a09] bg-grid select-none">
      {/* 1. Heavy Machinery & Quarry Background Image with Smooth Cinematic Ken Burns Motion */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/images/earthmoving_bg.jpg"
          alt="Operación Maquinaria y Movimiento de Tierras"
          className={`w-full h-full object-cover object-center scale-100 transition-transform duration-1000 ${
            isVideoActive ? 'animate-kenburns' : ''
          }`}
        />
      </div>

      {/* 2. Optional Video Layer (Overlay) */}
      {isVideoActive && !hasVideoError && (
        <div className="absolute inset-0 z-1 overflow-hidden pointer-events-none transition-opacity duration-1000">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setHasVideoError(true)}
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover opacity-30 mix-blend-screen"
          >
            <source src="/videos/earthmoving_bg.mp4" type="video/mp4" />
            <source src="/videos/earthmoving_bg.webm" type="video/webm" />
          </video>
        </div>
      )}

      {/* 3. Ambient Dust & Contour Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-2 pointer-events-none w-full h-full"
      />

      {/* 4. Balanced Cinematic Vignette Overlay (Gives high contrast to the login card while showcasing machinery) */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#070a09]/95 via-[#070a09]/50 to-[#070a09]/80 backdrop-blur-[0.5px] pointer-events-none" />

      {/* 5. Foreground Login Card */}
      <Card className="relative z-20 w-full max-w-md shadow-2xl border border-[#1e2925] bg-[#0b100e]/95 backdrop-blur-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Brand Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500" />

        <CardHeader className="text-center pb-2 pt-6 flex flex-col items-center">
          <div className="mb-3">
            <Logo size="lg" variant="full" textColor="text-white" />
          </div>
          <CardTitle className="text-2xl font-black text-white tracking-tight">
            Acceso al Sistema
          </CardTitle>
          <p className="text-slate-400 text-xs mt-1">
            Gestión Integral de Maquinarias, Mantenimiento y Faenas
          </p>
          {tenantSlug && (
            <div className="mt-2.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs">
              <Building2 size={13} className="text-emerald-400" />
              <span>Espacio: <strong className="uppercase">{tenantSlug}</strong>.katei.cl</span>
            </div>
          )}
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-3">
            {error && (
              <div className="bg-red-950/60 text-red-300 p-3 rounded-xl text-xs border border-red-900/60 font-medium">
                {error}
              </div>
            )}

            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="usuario@katei.cl"
              autoComplete="username"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#141c19] border-[#1e2925] text-white placeholder:text-slate-500"
            />

            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#141c19] border-[#1e2925] text-white placeholder:text-slate-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-[#1e2925] bg-[#141c19] text-emerald-600 focus:ring-0"
                />
                <span>Recordar sesión</span>
              </label>
              <span
                onClick={() => {
                  setForgotEmail(email);
                  setForgotError('');
                  setForgotSuccess('');
                  setShowForgotModal(true);
                }}
                className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-6">
            <Button
              type="submit"
              className={`w-full font-bold py-2.5 rounded-xl shadow-lg text-sm transition-all active:scale-[0.99] ${
                isTerrainMode
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
              isLoading={isLoading}
            >
              {isTerrainMode ? 'Ingresar a Modo Terreno' : 'Ingresar al Sistema'}
            </Button>

            <button
              type="button"
              onClick={() => setIsTerrainMode(!isTerrainMode)}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition shadow-sm ${
                isTerrainMode
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-amber-300 hover:text-amber-200'
              }`}
            >
              <Smartphone size={15} className={isTerrainMode ? 'text-emerald-400' : 'text-amber-400'} />
              <span>
                {isTerrainMode
                  ? 'Cambiar a Modo Plataforma / ERP'
                  : 'Modo Operador de Terreno (Móvil)'}
              </span>
            </button>

            {/* Footer Security Badge */}
            <div className="w-full flex items-center justify-center pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>KATEI — Plataforma de Gestión Operativa</span>
              </span>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Ambient Motion Toggle Button (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={toggleVideo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs backdrop-blur-md border border-slate-700/60 transition-colors shadow-lg"
          title={isVideoActive ? 'Pausar efecto de fondo' : 'Activar efecto animado'}
        >
          {isVideoActive ? (
            <>
              <VideoOff size={13} className="text-amber-400" />
              <span>Pausar Fondo</span>
            </>
          ) : (
            <>
              <Video size={13} className="text-emerald-400" />
              <span>Fondo Dinámico</span>
            </>
          )}
        </button>
      </div>

      {/* Modal de Recuperación de Contraseña */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Recuperar Contraseña"
      >
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Ingresá el correo electrónico asociado a tu cuenta. Te enviaremos un enlace transaccional
            seguro vía KATEI para que puedas restablecer tu contraseña.
          </p>

          {forgotSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs">
              {forgotSuccess}
            </div>
          )}

          {forgotError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">
              {forgotError}
            </div>
          )}

          {!forgotSuccess && (
            <Input
              label="Correo Registrado"
              type="email"
              placeholder="tu.correo@empresa.cl"
              icon={<Mail size={16} />}
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForgotModal(false)}
            >
              {forgotSuccess ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!forgotSuccess && (
              <Button type="submit" isLoading={isForgotLoading}>
                Enviar Instrucciones
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
