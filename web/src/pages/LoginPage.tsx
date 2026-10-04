import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Logo } from '../components/ui/Logo';
import { Mail, Lock, ShieldCheck, Video, VideoOff, Eye, EyeOff, Activity } from 'lucide-react';
import { APP_VERSION } from '../components/layout/Sidebar';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVideoActive, setIsVideoActive] = useState(true);
  const [hasVideoError, setHasVideoError] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

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

      // Deep radial gradient background
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.8
      );
      bgGrad.addColorStop(0, '#0f172a'); // slate-900
      bgGrad.addColorStop(0.6, '#090d16'); // slate-950
      bgGrad.addColorStop(1, '#020617'); // darkest slate
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Animated Topographic Elevation Contour Lines
      ctx.lineWidth = 1;
      for (let layer = 1; layer <= 4; layer++) {
        ctx.beginPath();
        const baseOffset = height * (0.55 + layer * 0.1);
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.08 - layer * 0.015})`; // Subtle blue glow

        for (let x = 0; x <= width; x += 20) {
          const wave1 = Math.sin(x * 0.003 + t + layer) * 35;
          const wave2 = Math.cos(x * 0.006 - t * 0.8 + layer) * 20;
          const y = baseOffset + wave1 + wave2;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Floating Particle Nodes
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 197, 253, ${p.alpha * 0.4})`; // Soft amber/blue speck
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
      {/* 1. Base Canvas (Topographic Elevation Lines & Ambient Particles) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none w-full h-full"
      />

      {/* 2. Background Video Layer with Error Fallback */}
      {isVideoActive && !hasVideoError && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none transition-opacity duration-1000">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setHasVideoError(true)}
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover opacity-60 mix-blend-screen"
          >
            <source src="/videos/earthmoving_bg.mp4" type="video/mp4" />
            <source src="/videos/earthmoving_bg.webm" type="video/webm" />
          </video>
        </div>
      )}

      {/* 3. Contrast & Focus Overlay */}
      <div className="absolute inset-0 z-10 bg-slate-950/70 backdrop-blur-[1.5px]" />

      {/* 4. Foreground Login Card */}
      <Card className="relative z-20 w-full max-w-md shadow-2xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Brand Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-amber-500 to-blue-600" />

        <CardHeader className="text-center pb-2 pt-6 flex flex-col items-center">
          <div className="mb-3">
            <Logo size="lg" variant="full" />
          </div>
          <CardTitle className="text-2xl font-black text-white tracking-tight">
            Acceso al Sistema
          </CardTitle>
          <p className="text-slate-400 text-xs mt-1">
            Gestión Integral de Maquinarias, Mantenimiento y Faenas
          </p>
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
              placeholder="usuario@sgmt.local"
              autoComplete="username"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500"
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
                className="bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500 pr-10"
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
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
                />
                <span>Recordar sesión</span>
              </label>
              <span className="text-blue-400 hover:underline cursor-pointer">
                ¿Olvidaste tu contraseña?
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pb-6">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-600/30 text-sm transition-all active:scale-[0.99]"
              isLoading={isLoading}
            >
              Ingresar al Sistema
            </Button>

            {/* Footer Security Badge */}
            <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>SGMT PRO {APP_VERSION}</span>
              </span>
              <span className="flex items-center gap-1">
                <Activity size={12} className="text-blue-400" />
                <span>LXC Node 106</span>
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
              <Video size={13} className="text-blue-400" />
              <span>Fondo Dinámico</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
