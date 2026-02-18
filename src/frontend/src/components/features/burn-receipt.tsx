'use client';

import { useRef, useEffect } from 'react';

export interface BurnReceiptProps {
  weeklyData: number[];  // weekly aggregated values for sparkline
  duration: string;      // e.g. "14 weeks"
  tokens: string;        // e.g. "485K"
  peakWeek: string;      // e.g. "52K"
}

function drawSparkline(canvas: HTMLCanvasElement, data: number[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx || data.length < 2) return;

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const maxVal = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (v / maxVal) * (h - 4) - 2,
  }));

  // Gradient fill
  const accentColor = '#6366f1';
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, accentColor + '25'); // ~15% opacity
  gradient.addColorStop(1, accentColor + '0d'); // ~5% opacity

  // Fill area
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      ctx.lineTo(points[i].x, points[i].y);
    } else {
      const cpx = (points[i - 1].x + points[i].x) / 2;
      ctx.bezierCurveTo(cpx, points[i - 1].y, cpx, points[i].y, points[i].x, points[i].y);
    }
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Stroke line
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      ctx.moveTo(points[i].x, points[i].y);
    } else {
      const cpx = (points[i - 1].x + points[i].x) / 2;
      ctx.bezierCurveTo(cpx, points[i - 1].y, cpx, points[i].y, points[i].x, points[i].y);
    }
  }
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function BurnReceipt({ weeklyData, duration, tokens, peakWeek }: BurnReceiptProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawSparkline(canvas, weeklyData);

    const handleResize = () => {
      if (canvasRef.current) {
        drawSparkline(canvasRef.current, weeklyData);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [weeklyData]);

  return (
    <div
      className="bg-accent-subtle flex flex-col gap-4 justify-center p-6"
      data-testid="burn-receipt"
    >
      {/* Label */}
      <span
        className="text-[10px] font-medium uppercase text-accent tracking-[0.05em]"
        data-testid="burn-receipt-label"
      >
        Burn Receipt
      </span>

      {/* Sparkline */}
      <div className="w-full h-10" data-testid="burn-receipt-sparkline">
        <canvas
          ref={canvasRef}
          data-testid="burn-receipt-canvas"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-2" data-testid="burn-receipt-stats">
        <div className="flex justify-between items-baseline">
          <span className="text-[11px] text-ink-tertiary">Duration</span>
          <span className="text-[13px] font-mono font-medium text-accent">{duration}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[11px] text-ink-tertiary">Tokens</span>
          <span className="text-[13px] font-mono font-medium text-accent">{tokens}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[11px] text-ink-tertiary">Peak week</span>
          <span className="text-[13px] font-mono font-medium text-accent">{peakWeek}</span>
        </div>
      </div>
    </div>
  );
}
