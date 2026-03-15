import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface VoiceInputProps {
  onResult: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function VoiceInput({ onResult, className, size = 'md' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.lang = 'fr-FR';

    recognitionInstance.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
      setError(null);
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone bloqué. Vérifiez les permissions ou ouvrez dans un nouvel onglet.');
      } else if (event.error === 'network') {
        setError('Erreur réseau.');
      } else {
        setError('Erreur d\'entrée vocale.');
      }
      setIsListening(false);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);
  }, [onResult]);

  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      setError(null);
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setIsListening(false);
      }
    }
  }, [recognition, isListening]);

  if (!isSupported) return null;

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="relative flex items-center">
      {error && (
        <div className="absolute bottom-full mb-2 right-0 bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-1">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={toggleListening}
        className={cn(
          "flex items-center justify-center rounded-full transition-all duration-200",
          isListening 
            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse ring-2 ring-red-500/20" 
            : error 
              ? "bg-red-50 dark:bg-red-900/10 text-red-400"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
          sizeClasses[size],
          className
        )}
        title={error || (isListening ? "Arrêter l'écoute" : "Entrée vocale")}
      >
        {isListening ? (
          <Mic className={iconSizeClasses[size]} />
        ) : error ? (
          <MicOff className={iconSizeClasses[size]} />
        ) : (
          <Mic className={iconSizeClasses[size]} />
        )}
      </button>
    </div>
  );
}
