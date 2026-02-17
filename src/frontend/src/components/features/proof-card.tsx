'use client';

import { useRef, useEffect } from 'react';
import { BurnReceipt, type BurnReceiptProps } from './burn-receipt';

export interface ProofCardProps {
  variant: 'hero' | 'compact';
  title: string;
  description: string;
  status: 'shipped' | 'in_progress';
  agentTools?: string[];                              // only shown on hero variant
  builders?: { initials: string; name: string }[];
  tribeLabel?: string;                                // e.g. "via Buildspace Alumni"
  // Hero-only:
  receipt?: BurnReceiptProps;
  // Compact-only:
  sparklineData?: number[];
  burnStat?: string;                                  // e.g. "420K · 13 wks"
}

const STATUS_CONFIG = {
  shipped: {
    label: 'Shipped',
    textClass: 'text-shipped',
    dotClass: 'bg-shipped',
  },
  in_progress: {
    label: 'Currently building',
    textClass: 'text-in-progress',
    dotClass: 'bg-in-progress',
  },
} as const;

function CompactSparkline({ data }: { data: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const maxVal = Math.max(...data, 1);
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - (v / maxVal) * (h - 2) - 1,
    }));

    const accentColor = '#6366f1';

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, accentColor + '25');
    gradient.addColorStop(1, accentColor + '0d');

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

    // Stroke
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
  }, [data]);

  return (
    <div className="flex-1" style={{ height: '16px' }} data-testid="compact-sparkline">
      <canvas
        ref={canvasRef}
        data-testid="compact-sparkline-canvas"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export function ProofCard({
  variant,
  title,
  description,
  status,
  agentTools,
  builders,
  tribeLabel,
  receipt,
  sparklineData,
  burnStat,
}: ProofCardProps) {
  const statusInfo = STATUS_CONFIG[status];

  if (variant === 'hero') {
    return (
      <div
        className="bg-surface-elevated rounded-2xl shadow-sm overflow-hidden cursor-pointer card-lift"
        data-testid="proof-card-hero"
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: '1fr 240px' }}
        >
          {/* Content area */}
          <div
            className="flex flex-col"
            style={{
              padding: '28px 32px',
              backgroundImage: 'radial-gradient(circle, rgba(28, 25, 23, 0.05) 1.2px, transparent 1.2px)',
              backgroundSize: '14px 14px',
            }}
          >
            {/* Status badge */}
            <div
              className={`inline-flex items-center gap-[5px] text-[11px] font-medium uppercase w-fit mb-2 ${statusInfo.textClass}`}
              style={{ letterSpacing: '0.04em' }}
              data-testid="proof-status"
            >
              <span className={`w-[5px] h-[5px] rounded-full ${statusInfo.dotClass}`} />
              {statusInfo.label}
            </div>

            {/* Title */}
            <h3
              className="font-serif text-[24px] leading-[1.2] text-ink mb-2"
              data-testid="proof-title"
            >
              {title}
            </h3>

            {/* Description */}
            <p
              className="text-[14px] text-ink-secondary leading-[1.65] mb-4"
              data-testid="proof-description"
            >
              {description}
            </p>

            {/* Agent tools (hero-only) */}
            {agentTools && agentTools.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4" data-testid="proof-agent-tools">
                {agentTools.map((tool) => (
                  <span
                    key={tool}
                    className="font-mono text-[11px] text-ink-tertiary bg-surface-secondary rounded-[4px]"
                    style={{ padding: '3px 8px' }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            )}

            {/* Footer: builders + tribe label */}
            <div className="flex items-center gap-4 mt-auto" data-testid="proof-footer">
              {builders && builders.length > 0 && (
                <div className="flex items-center">
                  <div className="flex items-center" data-testid="proof-builders">
                    {builders.map((builder, i) => (
                      <div
                        key={builder.initials + i}
                        className="w-6 h-6 rounded-full bg-surface-secondary flex items-center justify-center text-[9px] font-medium text-ink-secondary"
                        style={{
                          marginRight: '-6px',
                          outline: '2px solid var(--color-surface-elevated)',
                          zIndex: builders.length - i,
                          position: 'relative',
                        }}
                        title={builder.name}
                      >
                        {builder.initials}
                      </div>
                    ))}
                  </div>
                  <span
                    className="text-[11px] text-ink-tertiary"
                    style={{ marginLeft: '18px' }}
                    data-testid="proof-builder-count"
                  >
                    {builders.length} {builders.length === 1 ? 'builder' : 'builders'}
                  </span>
                </div>
              )}
              {tribeLabel && (
                <span
                  className="text-[11px] text-ink-tertiary italic"
                  data-testid="proof-tribe-label"
                >
                  {tribeLabel}
                </span>
              )}
            </div>
          </div>

          {/* Receipt panel (hero-only) */}
          {receipt && (
            <BurnReceipt {...receipt} />
          )}
        </div>
      </div>
    );
  }

  // Compact variant
  return (
    <div
      className="bg-surface-elevated rounded-xl shadow-sm cursor-pointer card-lift flex flex-col"
      style={{ padding: '20px 24px' }}
      data-testid="proof-card-compact"
    >
      {/* Status badge */}
      <div
        className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase w-fit mb-1.5 ${statusInfo.textClass}`}
        style={{ letterSpacing: '0.04em' }}
        data-testid="proof-status"
      >
        <span className={`w-1 h-1 rounded-full ${statusInfo.dotClass}`} />
        {statusInfo.label}
      </div>

      {/* Title */}
      <h4
        className="font-serif text-[18px] leading-[1.2] text-ink mb-1.5"
        data-testid="proof-title"
      >
        {title}
      </h4>

      {/* Description */}
      <p
        className="text-[13px] text-ink-secondary leading-[1.55] mb-3 flex-1"
        data-testid="proof-description"
      >
        {description}
      </p>

      {/* Sparkline + burn stat */}
      {(sparklineData || burnStat) && (
        <div className="flex items-center gap-2" data-testid="compact-burn-row">
          {sparklineData && sparklineData.length >= 2 && (
            <CompactSparkline data={sparklineData} />
          )}
          {burnStat && (
            <span
              className="font-mono text-[10px] text-ink-tertiary whitespace-nowrap"
              data-testid="compact-burn-stat"
            >
              {burnStat}
            </span>
          )}
        </div>
      )}

      {/* Tribe label */}
      {tribeLabel && (
        <span
          className="text-[11px] text-ink-tertiary italic mt-2"
          data-testid="proof-tribe-label"
        >
          {tribeLabel}
        </span>
      )}
    </div>
  );
}
