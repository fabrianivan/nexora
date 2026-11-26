'use client';

import React, { useEffect, useRef, useState } from 'react';
import { eyeOffset, lostDocLine, padlockCaption } from '@/lib/errorScenes';
import { cn } from './cn';

/**
 * Illustrations for the error pages: a lost document (404) and a guard
 * padlock (403). Both idle with small looping motions, follow the pointer with
 * their eyes, and react when clicked. Motion stops under prefers-reduced-motion
 * (see the `.nx-scene` rules in globals.css).
 */

function useEyes(ref: React.RefObject<HTMLElement | null>) {
  const [eye, setEye] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setEye(eyeOffset(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height * 0.45)));
      });
    };
    const reset = () => setEye({ x: 0, y: 0 });
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', reset);
    };
  }, [ref]);
  return eye;
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <span className="nx-pop-in absolute left-1/2 -top-3 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink shadow-md">
      {children}
      <span aria-hidden className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 size-2.5 rotate-45 border-b border-r border-line bg-surface" />
    </span>
  );
}

export function LostDocumentScene({ className }: { className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const eye = useEyes(ref);
  const [pokes, setPokes] = useState(0);
  const line = lostDocLine(pokes);

  return (
    <div className={cn('relative', className)}>
      <span aria-live="polite" className="contents">{line && <Bubble key={pokes}>{line}</Bubble>}</span>
      <button
        ref={ref}
        type="button"
        onClick={() => setPokes((n) => n + 1)}
        aria-label="Sapa dokumen yang hilang"
        className="block w-full cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
      >
        <svg viewBox="0 0 320 230" className="nx-scene block w-full h-auto" aria-hidden focusable="false">
          <text x="160" y="160" textAnchor="middle" className="fill-brand-100 font-serif" fontSize="156" letterSpacing="-6">404</text>
          <ellipse cx="160" cy="207" rx="62" ry="7" className="nx-shadow fill-ink/10" />
          <text x="236" y="74" fontSize="28" className="nx-float fill-brand-400 font-serif">?</text>
          <text x="78" y="92" fontSize="22" className="nx-float fill-brand-300 font-serif" style={{ animationDelay: '1.2s' }}>?</text>
          <text x="254" y="134" fontSize="18" className="nx-float fill-brand-300 font-serif" style={{ animationDelay: '2.4s' }}>?</text>

          <g key={pokes} className={pokes ? 'nx-hop' : undefined}>
            <g className="nx-bob">
              <path d="M118 44 H184 L210 70 V168 a12 12 0 0 1 -12 12 H118 a12 12 0 0 1 -12 -12 V56 a12 12 0 0 1 12 -12 Z" className="fill-surface stroke-ink" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M184 44 V62 a8 8 0 0 0 8 8 H210" className="fill-muted stroke-ink" strokeWidth="2.5" strokeLinejoin="round" />
              <rect x="122" y="60" width="40" height="5" rx="2.5" className="fill-brand-200" />
              <rect x="122" y="72" width="54" height="5" rx="2.5" className="fill-brand-200" />
              <rect x="122" y="152" width="72" height="5" rx="2.5" className="fill-line-strong" />
              <rect x="122" y="163" width="46" height="5" rx="2.5" className="fill-line-strong" />
              <ellipse cx="131" cy="124" rx="7" ry="4" className="fill-danger-100" />
              <ellipse cx="189" cy="124" rx="7" ry="4" className="fill-danger-100" />
              <g className="nx-blink">
                <g className="nx-look">
                  <g style={{ transform: `translate(${eye.x}px, ${eye.y}px)`, transition: 'transform 120ms ease-out' }}>
                    <ellipse cx="142" cy="108" rx="6.5" ry="7.5" className="fill-ink" />
                    <ellipse cx="178" cy="108" rx="6.5" ry="7.5" className="fill-ink" />
                    <circle cx="144.5" cy="105" r="2" className="fill-white" />
                    <circle cx="180.5" cy="105" r="2" className="fill-white" />
                  </g>
                </g>
              </g>
              <ellipse cx="160" cy="129" rx="4.5" ry="5.5" className="fill-ink" />
            </g>
          </g>

          <g transform="translate(240 128)">
            <g className="nx-sweep">
              <circle cx="0" cy="0" r="24" className="fill-brand-50/40 stroke-brand-600" strokeWidth="5" />
              <path d="M-12 -9 a15 15 0 0 1 10 -6" className="stroke-white" strokeWidth="3" strokeLinecap="round" fill="none" />
              <line x1="17" y1="17" x2="38" y2="38" className="stroke-ink" strokeWidth="8" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
}

function Sparkle({ x, y, size = 8, delay = '0s' }: { x: number; y: number; size?: number; delay?: string }) {
  const s = size;
  return (
    <path
      d={`M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`}
      className="nx-twinkle fill-brand-300"
      style={{ animationDelay: delay }}
    />
  );
}

export function LockedScene({ className }: { className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const eye = useEyes(ref);
  const [tries, setTries] = useState(0);
  const caption = padlockCaption(tries);

  return (
    <div className={cn('relative', className)}>
      <span aria-live="polite" className="contents">{caption && <Bubble key={tries}>{caption}</Bubble>}</span>
      <button
        ref={ref}
        type="button"
        onClick={() => setTries((n) => n + 1)}
        aria-label="Coba buka gembok"
        className="block w-full cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
      >
        <svg viewBox="0 0 320 230" className="nx-scene block w-full h-auto" aria-hidden focusable="false">
          <text x="160" y="160" textAnchor="middle" className="fill-brand-100 font-serif" fontSize="156" letterSpacing="-6">403</text>
          <ellipse cx="160" cy="207" rx="58" ry="7" className="nx-shadow fill-ink/10" />
          <Sparkle x={90} y={66} />
          <Sparkle x={238} y={58} size={6} delay="0.8s" />
          <Sparkle x={70} y={150} size={5} delay="1.6s" />

          <g key={tries} className={tries ? 'nx-shake' : undefined}>
            <g className="nx-wiggle">
              <g className="nx-shackle">
                <path d="M128 102 V80 a32 32 0 0 1 64 0 V102" fill="none" className="stroke-ink" strokeWidth="12" strokeLinecap="round" />
                <path d="M128 102 V80 a32 32 0 0 1 64 0 V102" fill="none" className="stroke-brand-200" strokeWidth="5" strokeLinecap="round" />
              </g>
              <rect x="102" y="96" width="116" height="98" rx="20" className="fill-brand-600 stroke-ink" strokeWidth="2.5" />
              <rect x="114" y="105" width="30" height="7" rx="3.5" className="fill-white/20" />
              <path d="M130 118 l14 4" className="stroke-white" strokeWidth="3" strokeLinecap="round" />
              <path d="M190 118 l-14 4" className="stroke-white" strokeWidth="3" strokeLinecap="round" />
              <g className="nx-blink">
                <ellipse cx="140" cy="134" rx="7.5" ry="8.5" className="fill-white" />
                <ellipse cx="180" cy="134" rx="7.5" ry="8.5" className="fill-white" />
                <g className="nx-look">
                  <g style={{ transform: `translate(${eye.x}px, ${eye.y}px)`, transition: 'transform 120ms ease-out' }}>
                    <circle cx="141" cy="135" r="3.8" className="fill-ink" />
                    <circle cx="181" cy="135" r="3.8" className="fill-ink" />
                  </g>
                </g>
              </g>
              <ellipse cx="126" cy="152" rx="7" ry="4" className="fill-danger-100/60" />
              <ellipse cx="194" cy="152" rx="7" ry="4" className="fill-danger-100/60" />
              <circle cx="160" cy="160" r="6.5" className="fill-brand-900" />
              <path d="M156 163 h8 l-1.6 12 h-4.8 z" className="fill-brand-900" />
            </g>
          </g>

          <g transform="translate(238 160)">
            <g className="nx-key">
              <circle cx="28" cy="0" r="13" className="fill-mark stroke-ink" strokeWidth="2.5" />
              <circle cx="28" cy="0" r="4.5" className="fill-surface stroke-ink" strokeWidth="2" />
              <rect x="-14" y="-3.5" width="30" height="7" rx="2" className="fill-mark stroke-ink" strokeWidth="2" />
              <rect x="-11" y="2" width="5" height="8" rx="1" className="fill-mark stroke-ink" strokeWidth="1.5" />
              <rect x="-3" y="2" width="4" height="6" rx="1" className="fill-mark stroke-ink" strokeWidth="1.5" />
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
}
