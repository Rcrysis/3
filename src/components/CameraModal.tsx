import React, { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';
import { X, Camera, RefreshCw } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  title?: string;
}

export default function CameraModal({ isOpen, onClose, onCapture, title = "Prendre une photo" }: CameraModalProps) {
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
      onClose();
    }
  }, [webcamRef, onCapture, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="text-lg font-medium">{title}</h2>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* @ts-expect-error react-webcam types issue */}
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode }}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay guides */}
        <div className="absolute inset-0 pointer-events-none border-[2px] border-white/20 m-8 rounded-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-sm font-medium">
            Alignez l'écran dans le cadre
          </div>
        </div>
      </div>

      <div className="p-8 flex items-center justify-center space-x-8 bg-black">
        <button 
          onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
          className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <RefreshCw className="w-6 h-6" />
        </button>
        
        <button 
          onClick={capture}
          className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Camera className="w-8 h-8 text-slate-900" />
        </button>
        
        <div className="w-14" /> {/* Spacer for balance */}
      </div>
    </div>
  );
}
