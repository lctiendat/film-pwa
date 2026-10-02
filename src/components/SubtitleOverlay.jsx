import React, { useMemo } from 'react';

export function SubtitleOverlay({
  cues = [],
  currentTime = 0,
  enabled = true,
  fontSize = 'md',
  offset = 0,
}) {
  if (!enabled || !Array.isArray(cues) || cues.length === 0) {
    return null;
  }

  const adjustedTime = currentTime + (offset || 0);

  // Find active cue
  const activeCue = useMemo(() => {
    return cues.find(
      (c) => adjustedTime >= c.start && adjustedTime <= c.end
    );
  }, [cues, adjustedTime]);

  if (!activeCue || !activeCue.text) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-sm sm:text-base leading-relaxed px-3 py-1',
    md: 'text-base sm:text-lg md:text-xl leading-snug px-4 py-1.5',
    lg: 'text-lg sm:text-xl md:text-2xl leading-snug px-5 py-2',
  }[fontSize] || 'text-base sm:text-lg md:text-xl leading-snug px-4 py-1.5';

  return (
    <div className="absolute bottom-[25%] sm:bottom-[20%] left-4 right-4 z-25 pointer-events-none flex justify-center items-center text-center animate-fade-in select-none">
      <div
        className={`inline-block max-w-[95%] transition-all ${sizeClasses}`}
        style={{
          textShadow: '0px 0px 4px rgba(0,0,0,0.8), 0px 2px 6px rgba(0,0,0,0.9), 0px -1px 2px rgba(0,0,0,0.8), 1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)'
        }}
      >
        <span className="text-[#facc15] font-semibold tracking-wide" style={{ fontFamily: 'sans-serif' }}>
          {activeCue.text}
        </span>
      </div>
    </div>
  );
}

export default SubtitleOverlay;
