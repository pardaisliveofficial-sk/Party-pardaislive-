import React from "react";

interface VipSvgMountProps {
  vipLevel: number;
  className?: string;
}

export const VipSvgMount: React.FC<VipSvgMountProps> = ({ vipLevel, className = "w-32 h-32" }) => {
  switch (vipLevel) {
    case 1:
      // VIP 1: Cyber Superbike (Spinning neon wheels, pulsing exhaust glow, speed rays)
      return (
        <svg viewBox="0 0 200 120" className={`${className} filter drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]`}>
          <defs>
            <linearGradient id="cyberBikeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <filter id="glowCyan">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Exhaust Flame Turbo Particles */}
          <g className="animate-pulse">
            <ellipse cx="20" cy="72" rx="18" ry="6" fill="#00f5ff" opacity="0.6" />
            <ellipse cx="10" cy="72" rx="12" ry="4" fill="#ff007f" opacity="0.8" />
            <path d="M 0 72 L 20 68 L 20 76 Z" fill="#ffffff" />
          </g>

          {/* Superbike Frame */}
          <path d="M 40 70 L 75 45 L 120 42 L 155 60 L 165 72 L 130 75 L 85 75 Z" fill="url(#cyberBikeGrad)" />
          
          {/* Neon Windshield & Cockpit */}
          <path d="M 115 42 L 135 25 L 150 42 Z" fill="#00f5ff" opacity="0.85" filter="url(#glowCyan)" />

          {/* Rider Silhouette */}
          <ellipse cx="105" cy="30" rx="9" ry="9" fill="#12121a" stroke="#00f5ff" strokeWidth="2" />
          <path d="M 98 38 C 105 32, 125 35, 132 46" fill="none" stroke="#00f5ff" strokeWidth="4" strokeLinecap="round" />

          {/* Rear Wheel (Spinning) */}
          <g className="animate-[spin_1s_linear_infinite]" style={{ transformOrigin: '50px 75px' }}>
            <circle cx="50" cy="75" r="22" fill="none" stroke="#00f5ff" strokeWidth="6" filter="url(#glowCyan)" />
            <circle cx="50" cy="75" r="14" fill="#0b0c10" stroke="#ff007f" strokeWidth="2" />
            <line x1="50" y1="53" x2="50" y2="97" stroke="#00f5ff" strokeWidth="2" />
            <line x1="28" y1="75" x2="72" y2="75" stroke="#00f5ff" strokeWidth="2" />
          </g>

          {/* Front Wheel (Spinning) */}
          <g className="animate-[spin_1s_linear_infinite]" style={{ transformOrigin: '155px 75px' }}>
            <circle cx="155" cy="75" r="22" fill="none" stroke="#00f5ff" strokeWidth="6" filter="url(#glowCyan)" />
            <circle cx="155" cy="75" r="14" fill="#0b0c10" stroke="#ff007f" strokeWidth="2" />
            <line x1="155" y1="53" x2="155" y2="97" stroke="#00f5ff" strokeWidth="2" />
            <line x1="133" y1="75" x2="177" y2="75" stroke="#00f5ff" strokeWidth="2" />
          </g>

          {/* Speed Headlight Laser Ray */}
          <polygon points="165,60 200,50 200,75 165,65" fill="#00f5ff" opacity="0.4" className="animate-pulse" />
        </svg>
      );

    case 2:
      // VIP 2: Luxury Bugatti Supercar (Drifting red-gold car, glowing rims, headlamps)
      return (
        <svg viewBox="0 0 220 120" className={`${className} filter drop-shadow-[0_0_18px_rgba(239,68,68,0.8)]`}>
          <defs>
            <linearGradient id="carBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="glass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" opacity="0.9" />
              <stop offset="100%" stopColor="#b45309" opacity="0.6" />
            </linearGradient>
          </defs>

          {/* Drift Smoke Trail */}
          <ellipse cx="25" cy="85" rx="20" ry="10" fill="#f59e0b" opacity="0.4" className="animate-ping" />

          {/* Car Body Shell */}
          <path d="M 25 80 L 45 55 L 90 40 L 155 42 L 195 62 L 205 80 Z" fill="url(#carBody)" />
          <path d="M 92 43 L 148 45 L 168 62 L 75 62 Z" fill="url(#glass)" />

          {/* Headlights Laser */}
          <polygon points="195,66 220,55 220,80 195,74" fill="#fef08a" opacity="0.7" className="animate-pulse" />

          {/* Front & Rear Spinning Rims */}
          <g className="animate-[spin_0.8s_linear_infinite]" style={{ transformOrigin: '60px 80px' }}>
            <circle cx="60" cy="80" r="18" fill="#18181b" stroke="#fbbf24" strokeWidth="4" />
            <circle cx="60" cy="80" r="8" fill="#ef4444" />
            <line x1="60" y1="62" x2="60" y2="98" stroke="#fbbf24" strokeWidth="2" />
            <line x1="42" y1="80" x2="78" y2="80" stroke="#fbbf24" strokeWidth="2" />
          </g>

          <g className="animate-[spin_0.8s_linear_infinite]" style={{ transformOrigin: '165px 80px' }}>
            <circle cx="165" cy="80" r="18" fill="#18181b" stroke="#fbbf24" strokeWidth="4" />
            <circle cx="165" cy="80" r="8" fill="#ef4444" />
            <line x1="165" y1="62" x2="165" y2="98" stroke="#fbbf24" strokeWidth="2" />
            <line x1="147" y1="80" x2="183" y2="80" stroke="#fbbf24" strokeWidth="2" />
          </g>
        </svg>
      );

    case 3:
      // VIP 3: Royal Mustang Warhorse (Galloping legs, flaming mane)
      return (
        <svg viewBox="0 0 200 140" className={`${className} filter drop-shadow-[0_0_18px_rgba(245,158,11,0.85)]`}>
          <defs>
            <linearGradient id="horseGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>

          {/* Flaming Mane */}
          <path d="M 130 30 C 110 20, 95 35, 105 55 Z" fill="#ef4444" className="animate-pulse" />
          <path d="M 135 25 C 120 15, 105 25, 115 45 Z" fill="#f59e0b" className="animate-bounce" />

          {/* Horse Body */}
          <path d="M 60 70 C 80 50, 120 50, 140 35 C 155 30, 165 40, 155 55 C 145 65, 120 75, 110 80 C 90 85, 70 85, 60 70 Z" fill="url(#horseGold)" />

          {/* Head & Snort */}
          <path d="M 140 35 L 165 20 L 175 35 L 150 50 Z" fill="url(#horseGold)" />
          <circle cx="168" cy="26" r="2.5" fill="#ffffff" />

          {/* Galloping Legs Animation */}
          <g className="animate-[bounce_0.4s_ease-in-out_infinite]">
            {/* Front Leg 1 */}
            <path d="M 135 70 L 155 95 L 170 115" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
            {/* Front Leg 2 */}
            <path d="M 125 70 L 140 95 L 150 115" stroke="#d97706" strokeWidth="5" strokeLinecap="round" />
            {/* Back Leg 1 */}
            <path d="M 70 75 L 50 100 L 35 115" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
            {/* Back Leg 2 */}
            <path d="M 80 75 L 65 98 L 50 115" stroke="#d97706" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Fiery Hoof Sparks */}
          <circle cx="170" cy="115" r="4" fill="#ef4444" className="animate-ping" />
          <circle cx="35" cy="115" r="4" fill="#ef4444" className="animate-ping" />
        </svg>
      );

    case 4:
      // VIP 4: Imperial Golden Tiger (Leaping tiger with claw slash effects)
      return (
        <svg viewBox="0 0 220 130" className={`${className} filter drop-shadow-[0_0_20px_rgba(249,115,22,0.9)]`}>
          <defs>
            <linearGradient id="tigerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffedd5" />
              <stop offset="40%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
          </defs>

          {/* Electric Claw Slash FX */}
          <g className="animate-pulse">
            <path d="M 170 20 L 210 50" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
            <path d="M 180 15 L 215 40" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
            <path d="M 160 30 L 200 60" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* Tiger Body (Leaping Pose) */}
          <path d="M 40 75 C 60 55, 110 45, 150 40 C 175 35, 185 50, 175 65 C 150 80, 100 85, 55 85 Z" fill="url(#tigerGrad)" />

          {/* Tiger Stripes */}
          <path d="M 70 52 L 75 68 M 95 48 L 100 68 M 120 45 L 125 67 M 145 43 L 148 65" stroke="#18181b" strokeWidth="3.5" strokeLinecap="round" />

          {/* Tiger Head */}
          <ellipse cx="178" cy="48" rx="16" ry="14" fill="url(#tigerGrad)" />
          <circle cx="184" cy="44" r="3" fill="#18181b" />
          <polygon points="190,48 198,46 194,54" fill="#ef4444" />

          {/* Leaping Paws */}
          <path d="M 165 65 L 195 85 M 150 68 L 180 92" stroke="#f97316" strokeWidth="7" strokeLinecap="round" />
          <path d="M 60 80 L 30 100 M 45 82 L 15 105" stroke="#f97316" strokeWidth="7" strokeLinecap="round" />
        </svg>
      );

    case 5:
      // VIP 5: Imperial Fire Dragon (Flapping wings, breathing animated fire streams)
      return (
        <svg viewBox="0 0 240 150" className={`${className} filter drop-shadow-[0_0_22px_rgba(244,63,94,0.9)]`}>
          <defs>
            <linearGradient id="dragonRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="50%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
          </defs>

          {/* Fire Stream Breath */}
          <g className="animate-pulse">
            <path d="M 195 55 L 240 40 L 230 75 Z" fill="#facc15" opacity="0.8" />
            <path d="M 200 57 L 240 50 L 235 68 Z" fill="#f97316" />
          </g>

          {/* Flapping Wing Left */}
          <g className="animate-[bounce_0.6s_ease-in-out_infinite]" style={{ transformOrigin: '110px 50px' }}>
            <path d="M 110 50 Q 70 5, 20 25 Q 60 65, 110 50 Z" fill="url(#dragonRed)" stroke="#f43f5e" strokeWidth="2" />
            <path d="M 110 50 L 30 25 M 110 50 L 55 45" stroke="#facc15" strokeWidth="1.5" />
          </g>

          {/* Flapping Wing Right */}
          <g className="animate-[bounce_0.6s_ease-in-out_infinite]" style={{ transformOrigin: '130px 50px' }}>
            <path d="M 130 50 Q 170 5, 210 30 Q 160 70, 130 50 Z" fill="url(#dragonRed)" stroke="#f43f5e" strokeWidth="2" />
          </g>

          {/* Dragon Body & Tail */}
          <path d="M 50 110 C 70 80, 110 70, 150 60 C 175 55, 195 45, 190 65 C 170 80, 120 95, 75 115 Z" fill="url(#dragonRed)" />

          {/* Dragon Head */}
          <path d="M 175 55 L 200 45 L 190 65 Z" fill="url(#dragonRed)" />
          <circle cx="185" cy="50" r="3" fill="#facc15" className="animate-ping" />
        </svg>
      );

    case 6:
      // VIP 6: Majestic King Lion (Roaring lion with golden crown & mane)
      return (
        <svg viewBox="0 0 200 140" className={`${className} filter drop-shadow-[0_0_20px_rgba(234,179,8,0.9)]`}>
          <defs>
            <linearGradient id="lionGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
          </defs>

          {/* Royal Crown */}
          <g className="animate-bounce">
            <polygon points="135,18 142,5 150,18 158,5 165,18" fill="#facc15" stroke="#b45309" strokeWidth="1.5" />
            <circle cx="142" cy="5" r="2" fill="#ef4444" />
            <circle cx="158" cy="5" r="2" fill="#ef4444" />
          </g>

          {/* Giant Mane */}
          <circle cx="150" cy="50" r="32" fill="#b45309" className="animate-pulse" />
          <circle cx="150" cy="50" r="26" fill="#eab308" />

          {/* Body */}
          <path d="M 40 85 C 60 65, 100 60, 140 55 C 160 55, 160 75, 140 85 C 110 95, 70 95, 45 85 Z" fill="url(#lionGold)" />

          {/* Lion Face */}
          <ellipse cx="156" cy="48" rx="14" ry="12" fill="url(#lionGold)" />
          <circle cx="160" cy="44" r="2.5" fill="#18181b" />
          <polygon points="164,48 170,47 167,53" fill="#18181b" />

          {/* Legs */}
          <path d="M 135 80 L 145 115 M 120 80 L 125 115" stroke="#eab308" strokeWidth="7" strokeLinecap="round" />
          <path d="M 60 85 L 50 115 M 75 85 L 70 115" stroke="#eab308" strokeWidth="7" strokeLinecap="round" />
        </svg>
      );

    case 7:
      // VIP 7: Sunfire Phoenix Mount (Soaring, flapping flaming wings, golden feather sparks)
      return (
        <svg viewBox="0 0 240 150" className={`${className} filter drop-shadow-[0_0_25px_rgba(217,70,239,0.95)]`}>
          <defs>
            <linearGradient id="phoenixPink" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#701a75" />
            </linearGradient>
          </defs>

          {/* Golden Feather Sparks */}
          <g className="animate-ping">
            <circle cx="30" cy="90" r="3" fill="#facc15" />
            <circle cx="50" cy="110" r="4" fill="#d946ef" />
            <circle cx="20" cy="60" r="2" fill="#ffffff" />
          </g>

          {/* Wing Left (Flapping) */}
          <g className="animate-[bounce_0.5s_ease-in-out_infinite]" style={{ transformOrigin: '120px 60px' }}>
            <path d="M 120 60 Q 60 0, 10 30 Q 60 80, 120 60 Z" fill="url(#phoenixPink)" />
            <path d="M 10 30 Q 40 50, 80 55" stroke="#facc15" strokeWidth="3" />
          </g>

          {/* Wing Right */}
          <g className="animate-[bounce_0.5s_ease-in-out_infinite]" style={{ transformOrigin: '120px 60px' }}>
            <path d="M 120 60 Q 180 0, 230 30 Q 180 80, 120 60 Z" fill="url(#phoenixPink)" />
          </g>

          {/* Phoenix Crest & Tail */}
          <path d="M 120 60 C 130 90, 100 130, 40 140 Z" fill="url(#phoenixPink)" />
          <ellipse cx="120" cy="50" rx="10" ry="12" fill="#facc15" />
        </svg>
      );

    case 8:
      // VIP 8: Mythic Starlight Unicorn / Pegasus (Flapping wings, glowing spiral horn, starlight)
      return (
        <svg viewBox="0 0 220 140" className={`${className} filter drop-shadow-[0_0_25px_rgba(168,85,247,0.95)]`}>
          <defs>
            <linearGradient id="unicornPurp" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#581c87" />
            </linearGradient>
          </defs>

          {/* Spiral Glowing Horn */}
          <polygon points="175,25 185,2 178,28" fill="#facc15" className="animate-pulse" />

          {/* Pegasus Wing */}
          <g className="animate-[bounce_0.5s_ease-in-out_infinite]" style={{ transformOrigin: '110px 50px' }}>
            <path d="M 110 50 Q 70 5, 30 25 Q 70 70, 110 50 Z" fill="url(#unicornPurp)" stroke="#e9d5ff" strokeWidth="2" />
          </g>

          {/* Body */}
          <path d="M 70 70 C 90 50, 130 45, 155 35 C 170 30, 178 45, 165 58 C 145 70, 110 80, 75 75 Z" fill="url(#unicornPurp)" />

          {/* Galloping Legs */}
          <path d="M 145 60 L 165 105 M 130 60 L 140 105" stroke="#c084fc" strokeWidth="6" strokeLinecap="round" />
          <path d="M 80 65 L 60 105 M 95 65 L 80 105" stroke="#c084fc" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );

    case 9:
      // VIP 9: Galactic Quantum UFO (Alien saucer, spinning beam, green laser tractor spotlight)
      return (
        <svg viewBox="0 0 200 150" className={`${className} filter drop-shadow-[0_0_25px_rgba(16,185,129,0.95)]`}>
          <defs>
            <linearGradient id="ufoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>

          {/* Green Laser Tractor Beam */}
          <polygon points="100,60 30,150 170,150" fill="#10b981" opacity="0.35" className="animate-pulse" />

          {/* UFO Glass Dome */}
          <ellipse cx="100" cy="40" rx="30" ry="22" fill="#6ee7b7" opacity="0.85" />
          <circle cx="100" cy="35" r="8" fill="#ffffff" className="animate-ping" />

          {/* Saucer Ring */}
          <ellipse cx="100" cy="58" rx="75" ry="16" fill="url(#ufoGrad)" stroke="#34d399" strokeWidth="3" />

          {/* Revolving Signal Lights */}
          <g className="animate-[spin_2s_linear_infinite]" style={{ transformOrigin: '100px 58px' }}>
            <circle cx="45" cy="58" r="4" fill="#facc15" />
            <circle cx="75" cy="64" r="4" fill="#38bdf8" />
            <circle cx="100" cy="65" r="4" fill="#f43f5e" />
            <circle cx="125" cy="64" r="4" fill="#38bdf8" />
            <circle cx="155" cy="58" r="4" fill="#facc15" />
          </g>
        </svg>
      );

    case 10:
      // VIP 10: Imperial Diamond Carriage (4-Horse Gold Carriage, spinning diamond wheels)
      return (
        <svg viewBox="0 0 240 140" className={`${className} filter drop-shadow-[0_0_28px_rgba(251,191,36,0.95)]`}>
          <defs>
            <linearGradient id="carriageGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>

          {/* Crown Canopy Roof */}
          <polygon points="70,20 80,5 90,20" fill="#facc15" className="animate-bounce" />

          {/* Carriage Cabin */}
          <rect x="40" y="25" width="80" height="55" rx="15" fill="url(#carriageGold)" stroke="#ffffff" strokeWidth="3" />
          <rect x="55" y="38" width="50" height="28" rx="8" fill="#18181b" stroke="#fbbf24" strokeWidth="2" />

          {/* Spinning Diamond Wheels */}
          <g className="animate-[spin_1s_linear_infinite]" style={{ transformOrigin: '55px 82px' }}>
            <circle cx="55" cy="82" r="16" fill="none" stroke="#facc15" strokeWidth="4" />
            <line x1="55" y1="66" x2="55" y2="98" stroke="#ffffff" strokeWidth="2" />
            <line x1="39" y1="82" x2="71" y2="82" stroke="#ffffff" strokeWidth="2" />
          </g>
          <g className="animate-[spin_1s_linear_infinite]" style={{ transformOrigin: '105px 82px' }}>
            <circle cx="105" cy="82" r="16" fill="none" stroke="#facc15" strokeWidth="4" />
            <line x1="105" y1="66" x2="105" y2="98" stroke="#ffffff" strokeWidth="2" />
            <line x1="89" y1="82" x2="121" y2="82" stroke="#ffffff" strokeWidth="2" />
          </g>

          {/* Galloping Royal Horses in Front */}
          <g className="animate-[bounce_0.4s_ease-in-out_infinite]">
            <path d="M 140 60 L 180 40 L 210 50 L 190 70 Z" fill="#fbbf24" />
            <path d="M 175 70 L 190 100 M 160 70 L 170 100" stroke="#fbbf24" strokeWidth="5" />
          </g>
        </svg>
      );

    case 11:
      // VIP 11: Cybernetic Titan Dragon (Mecha dragon, mechanical wings, cyan plasma beams)
      return (
        <svg viewBox="0 0 250 150" className={`${className} filter drop-shadow-[0_0_30px_rgba(236,72,153,1)]`}>
          <defs>
            <linearGradient id="mechaTitan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#db2777" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
          </defs>

          {/* Plasma Beam */}
          <path d="M 205 60 L 250 50 L 250 75 Z" fill="#00f5ff" className="animate-pulse" />

          {/* Mecha Wings */}
          <g className="animate-[bounce_0.5s_ease-in-out_infinite]" style={{ transformOrigin: '125px 55px' }}>
            <polygon points="125,55 50,10 10,40 80,75" fill="url(#mechaTitan)" stroke="#00f5ff" strokeWidth="2" />
            <polygon points="125,55 200,10 240,40 170,75" fill="url(#mechaTitan)" stroke="#00f5ff" strokeWidth="2" />
          </g>

          {/* Dragon Mecha Body */}
          <path d="M 60 100 C 90 70, 140 65, 185 55 L 205 60 L 190 80 C 145 95, 95 110, 60 100 Z" fill="url(#mechaTitan)" />
          <circle cx="170" cy="65" r="5" fill="#00f5ff" className="animate-ping" />
        </svg>
      );

    case 12:
    default:
      // VIP 12: Cosmic Sovereign Starfleet (Mothership with orbiting drones & supernova portal)
      return (
        <svg viewBox="0 0 260 160" className={`${className} filter drop-shadow-[0_0_35px_rgba(129,140,248,1)]`}>
          <defs>
            <linearGradient id="starfleet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0e7ff" />
              <stop offset="40%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
          </defs>

          {/* Supernova Portal Ring */}
          <circle cx="130" cy="80" r="70" fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="8 6" className="animate-[spin_4s_linear_infinite]" />

          {/* Cosmic Flagship */}
          <polygon points="130,20 210,90 130,140 50,90" fill="url(#starfleet)" stroke="#818cf8" strokeWidth="3" />
          <polygon points="130,40 180,90 130,120 80,90" fill="#1e1b4b" />
          <circle cx="130" cy="80" r="14" fill="#00f5ff" className="animate-pulse" />

          {/* Orbiting Fighter Drones */}
          <g className="animate-[spin_2s_linear_infinite]" style={{ transformOrigin: '130px 80px' }}>
            <circle cx="40" cy="80" r="6" fill="#f43f5e" />
            <circle cx="220" cy="80" r="6" fill="#facc15" />
          </g>
        </svg>
      );
  }
};
