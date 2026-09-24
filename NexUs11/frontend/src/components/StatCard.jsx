import React, { useState, useEffect } from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, accentColor }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = typeof value === 'number' ? value : parseInt(value, 10) || 0;
    if (target === 0) {
      setDisplayValue(0);
      return;
    }

    const duration = 400; // 400ms ease-out
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(easeOut * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between">
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#1E1B4B]">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
          {displayValue}
        </div>
        {subtitle && (
          <p className="text-xs text-[#64748B] mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
