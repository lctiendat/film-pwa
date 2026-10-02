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
    sm: 'text-xs sm:text-sm leading-relaxed px-3 py-1',
    md: 'text-sm sm:text-base leading-snug px-4 py-1.5',
    lg: 'text-base sm:text-lg leading-snug px-5 py-2',
  }[fontSize] || 'text-sm sm:text-base leading-snug px-4 py-1.5';

  return (
    <div className="absolute bottom-10 sm:bottom-12 left-3 right-3 z-25 pointer-events-none flex justify-center items-center text-center animate-fade-in select-none">
      <div
        className={`inline-block max-w-[92%] rounded-2xl bg-black/85 backdrop-blur-md border border-white/15 shadow-2xl shadow-black/80 transition-all ${sizeClasses}`}
      >
        <span className="text-white font-medium tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
          {activeCue.text}
        </span>
      </div>
    </div>
  );
}

export default SubtitleOverlay;
