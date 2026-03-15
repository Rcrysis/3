import React, { useState, useRef, useEffect } from 'react';

interface PatternLockProps {
  onComplete: (pattern: string) => void;
  width?: number;
  height?: number;
  dotRadius?: number;
  error?: boolean;
}

export default function PatternLock({ 
  onComplete, 
  width = 300, 
  height = 300, 
  dotRadius = 10,
  error = false
}: PatternLockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [path, setPath] = useState<number[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

  const dots = Array.from({ length: 9 }, (_, i) => ({
    id: i,
    x: (i % 3) * (width / 2) + (width / 6) * (i % 3 === 0 ? 1 : i % 3 === 1 ? 0 : -1) + (width / 4) * (i % 3),
    y: Math.floor(i / 3) * (height / 2) + (height / 6) * (Math.floor(i / 3) === 0 ? 1 : Math.floor(i / 3) === 1 ? 0 : -1) + (height / 4) * Math.floor(i / 3)
  }));

  // Correct dots calculation for a 3x3 grid
  const getDotPos = (i: number) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const padding = 40;
    const x = padding + col * (width - 2 * padding) / 2;
    const y = padding + row * (height - 2 * padding) / 2;
    return { x, y };
  };

  const gridDots = Array.from({ length: 9 }, (_, i) => ({
    id: i,
    ...getDotPos(i)
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw lines
    if (path.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = error ? '#ef4444' : '#3b82f6';

      const start = gridDots[path[0]];
      ctx.moveTo(start.x, start.y);

      for (let i = 1; i < path.length; i++) {
        const p = gridDots[path[i]];
        ctx.lineTo(p.x, p.y);
      }

      if (mousePos && isDrawing) {
        ctx.lineTo(mousePos.x, mousePos.y);
      }
      ctx.stroke();
    }

    // Draw dots
    gridDots.forEach(dot => {
      const isActive = path.includes(dot.id);
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? (error ? '#ef4444' : '#3b82f6') : '#94a3b8';
      ctx.fill();

      if (isActive) {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = error ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)';
        ctx.fill();
      }
    });
  }, [path, mousePos, isDrawing, error, width, height, dotRadius]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setPath([]);
    handleMove(e);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    setMousePos({ x, y });

    gridDots.forEach(dot => {
      const dist = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2);
      if (dist < 30 && !path.includes(dot.id)) {
        setPath(prev => [...prev, dot.id]);
      }
    });
  };

  const handleEnd = () => {
    setIsDrawing(false);
    setMousePos(null);
    if (path.length > 0) {
      onComplete(path.join(','));
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      className="touch-none cursor-crosshair mx-auto"
    />
  );
}
