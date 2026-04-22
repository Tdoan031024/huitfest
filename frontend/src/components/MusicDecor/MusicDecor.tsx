'use client';

import React from 'react';

export default function MusicDecor() {
  return (
    <div className="music-decor-layer" aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* Top Left Area */}
      <div className="music-decor decor-la" style={{ top: '15%', left: '-20px' }} />
      <div className="music-decor decor-si" style={{ top: '50%', left: '-40px' }} />
      
      {/* Right Area */}
      <div className="music-decor decor-guitar" style={{ top: '30%', right: '40px' }} />
      
      {/* Bottom Area */}
      <div className="music-decor decor-pha" style={{ bottom: '10%', left: '20px' }} />
      <div className="music-decor decor-piano" style={{ bottom: '20%', right: '5%' }} />
      
      {/* Floating lights (recreated from ladi spots) */}
      <div style={{
        position: 'absolute',
        width: '40vw',
        height: '40vw',
        background: 'radial-gradient(circle, rgba(138, 144, 255, 0.15) 0%, transparent 70%)',
        top: '-10%',
        left: '20%',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(0, 168, 214, 0.1) 0%, transparent 70%)',
        bottom: '-10%',
        right: '10%',
        filter: 'blur(80px)',
      }} />
    </div>
  );
}
