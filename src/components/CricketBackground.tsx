export const CricketBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-5">
      {/* Cricket Ball Pattern */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`ball-${i}`}
          className="absolute animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${15 + i * 2}s`,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 100 100" fill="currentColor" className="text-primary">
            <circle cx="50" cy="50" r="45" opacity="0.3"/>
            <path d="M20 50 Q30 30, 50 20" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
            <path d="M50 80 Q70 70, 80 50" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
          </svg>
        </div>
      ))}
      
      {/* Cricket Bat Pattern */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`bat-${i}`}
          className="absolute animate-float-reverse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${20 + i * 3}s`,
          }}
        >
          <svg width="40" height="80" viewBox="0 0 50 100" fill="currentColor" className="text-accent">
            <rect x="20" y="0" width="10" height="60" rx="5" opacity="0.3"/>
            <rect x="10" y="55" width="30" height="40" rx="3" opacity="0.3"/>
          </svg>
        </div>
      ))}
      
      {/* Stumps Pattern */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`stump-${i}`}
          className="absolute animate-pulse-slow"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 1}s`,
          }}
        >
          <svg width="30" height="60" viewBox="0 0 60 120" fill="currentColor" className="text-secondary">
            <rect x="10" y="20" width="8" height="80" opacity="0.2"/>
            <rect x="26" y="20" width="8" height="80" opacity="0.2"/>
            <rect x="42" y="20" width="8" height="80" opacity="0.2"/>
            <rect x="8" y="18" width="44" height="4" opacity="0.2"/>
          </svg>
        </div>
      ))}
    </div>
  );
};
