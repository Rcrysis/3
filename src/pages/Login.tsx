import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Fingerprint, Grid3X3 } from 'lucide-react';
import { db } from '../services/db';
import PatternLock from '../components/PatternLock';
import { UserProfile } from '../types';

export default function Login() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState('');
  const [authMethod, setAuthMethod] = useState<'pin' | 'pattern' | 'biometric'>('pin');
  const [error, setError] = useState('');

  useEffect(() => {
    const existingUser = db.getUser();
    if (existingUser) {
      setUser(existingUser);
      setAuthMethod(existingUser.authMethod || 'pin');
      
      // Auto-trigger biometric if enabled
      if (existingUser.biometricEnabled && existingUser.authMethod === 'biometric') {
        handleBiometric();
      }
    }
  }, []);

  const handleBiometric = async () => {
    const success = await db.loginWithBiometric();
    if (success) {
      navigate('/');
    } else {
      setError('Échec de l\'authentification biométrique');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (authMethod === 'pin') {
      if (db.login(pin)) {
        navigate('/');
      } else {
        setError('Code PIN invalide (Défaut: 1234)');
      }
    }
  };

  const handlePatternComplete = (p: string) => {
    if (db.loginWithPattern(p)) {
      navigate('/');
    } else {
      setError('Schéma invalide');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Activity className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Smart Health Tracker
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Déverrouillez pour accéder à vos données
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-xl shadow-slate-200/50 dark:shadow-none sm:rounded-2xl sm:px-10 border border-slate-100 dark:border-slate-800 transition-colors">
          {user && (
            <div className="flex justify-center space-x-4 mb-8">
              <button
                onClick={() => setAuthMethod('pin')}
                className={`p-3 rounded-xl transition-colors ${authMethod === 'pin' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="PIN"
              >
                <Lock className="w-6 h-6" />
              </button>
              {user.pattern && (
                <button
                  onClick={() => setAuthMethod('pattern')}
                  className={`p-3 rounded-xl transition-colors ${authMethod === 'pattern' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  title="Schéma"
                >
                  <Grid3X3 className="w-6 h-6" />
                </button>
              )}
              {user.biometricEnabled && (
                <button
                  onClick={() => {
                    setAuthMethod('biometric');
                    handleBiometric();
                  }}
                  className={`p-3 rounded-xl transition-colors ${authMethod === 'biometric' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  title="Biométrie"
                >
                  <Fingerprint className="w-6 h-6" />
                </button>
              )}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {authMethod === 'pin' && (
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Code PIN sécurisé
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="****"
                  />
                </div>
              </div>
            )}

            {authMethod === 'pattern' && (
              <div className="flex flex-col items-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Dessinez votre schéma</p>
                <PatternLock onComplete={handlePatternComplete} error={!!error} />
              </div>
            )}

            {authMethod === 'biometric' && (
              <div className="flex flex-col items-center py-8">
                <button
                  type="button"
                  onClick={handleBiometric}
                  className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <Fingerprint className="w-10 h-10" />
                </button>
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Touchez pour utiliser la biométrie</p>
              </div>
            )}

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm font-medium text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">
                {error}
              </div>
            )}

            {authMethod === 'pin' && (
              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Déverrouiller
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
