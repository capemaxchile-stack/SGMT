import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/Card';
import { Logo } from '../components/ui/Logo';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'El enlace de recuperación es inválido o ha expirado.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-center p-6">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Enlace no válido</h2>
          <p className="text-xs text-slate-400 mb-6">
            El enlace para restablecer tu contraseña no contiene un token válido o está incompleto.
          </p>
          <Link to="/login">
            <Button className="w-full">Volver al Inicio de Sesión</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <Card className="w-full max-w-md bg-slate-900/95 border-slate-800/80 shadow-2xl backdrop-blur-xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <CardTitle className="text-2xl font-black text-white tracking-tight">
            Nueva Contraseña
          </CardTitle>
          <p className="text-slate-400 text-xs mt-1">
            Ingresá tu nueva contraseña para acceder a la plataforma
          </p>
        </CardHeader>

        {success ? (
          <CardContent className="space-y-4 pt-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-base font-bold text-white">¡Contraseña restablecida!</h3>
            <p className="text-xs text-slate-300">
              Tu contraseña ha sido actualizada con éxito. Ya podés iniciar sesión normalmente.
            </p>
            <div className="pt-4">
              <Button onClick={() => navigate('/login')} className="w-full bg-emerald-600 hover:bg-emerald-500">
                Iniciar Sesión Ahora
              </Button>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              {error && (
                <div className="bg-red-950/60 text-red-300 p-3 rounded-xl text-xs border border-red-900/60 font-medium">
                  {error}
                </div>
              )}

              <div className="relative">
                <Input
                  label="Nueva Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  icon={<Lock size={18} />}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <Input
                label="Confirmar Nueva Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock size={18} />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500"
              />
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pb-6">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-600/30 text-sm"
                isLoading={isLoading}
              >
                Actualizar Contraseña
              </Button>
              <Link to="/login" className="text-center text-xs text-slate-400 hover:text-slate-200">
                Cancelar y Volver al Login
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
