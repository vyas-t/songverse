import React from 'react';

// =========================================================================
// LAYER 1: HERO SKY & MOUNTAIN HORIZON (SUNSET DUSK AESTHETIC)
// =========================================================================
export const HeroSkyAndMountains: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-full overflow-hidden select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1920 1080"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover object-bottom"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Sky Gradient: Deep cosmic zenith to burning golden dusk */}
          <linearGradient id="heroSkyGrad" x1="960" y1="0" x2="960" y2="1080" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#070414" />
            <stop offset="25%" stopColor="#1a0a2a" />
            <stop offset="48%" stopColor="#431444" />
            <stop offset="68%" stopColor="#8d2b45" />
            <stop offset="84%" stopColor="#db583b" />
            <stop offset="93%" stopColor="#f59e42" />
            <stop offset="100%" stopColor="#fed27d" />
          </linearGradient>

          {/* Sinking Celestial Sun Glow */}
          <radialGradient id="sunGlow" cx="960" cy="820" r="420" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF9E6" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#FED27D" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#E05B38" stopOpacity="0.35" />
            <stop offset="85%" stopColor="#6E1E48" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#070414" stopOpacity="0" />
          </radialGradient>

          {/* Far Mountains Depth Gradient */}
          <linearGradient id="farMountainsGrad" x1="960" y1="580" x2="960" y2="920" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4a1d52" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#2b1138" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#150821" stopOpacity="1" />
          </linearGradient>

          {/* Mid Mountains Depth Gradient */}
          <linearGradient id="midMountainsGrad" x1="960" y1="650" x2="960" y2="1080" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#250d33" />
            <stop offset="50%" stopColor="#150720" />
            <stop offset="100%" stopColor="#0a0312" />
          </linearGradient>

          {/* Atmospheric Mist Band Gradients */}
          <linearGradient id="mistGrad1" x1="0" y1="0" x2="1920" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffb370" stopOpacity="0" />
            <stop offset="30%" stopColor="#ffb370" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#f27d52" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffb370" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mistGrad2" x1="0" y1="0" x2="1920" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffeed4" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffeed4" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffeed4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. Dusk Sky Backdrop */}
        <rect width="1920" height="1080" fill="url(#heroSkyGrad)" />

        {/* 2. Sinking Sun / Atmospheric Corona */}
        <circle cx="960" cy="820" r="420" fill="url(#sunGlow)" />
        <circle cx="960" cy="780" r="95" fill="#FFF9E6" fillOpacity="0.85" filter="blur(8px)" />
        <circle cx="960" cy="780" r="70" fill="#FFFBF0" />

        {/* 3. Subtle Twinkling Twilight Stars at the Zenith */}
        <g opacity="0.6">
          <circle cx="280" cy="110" r="1.5" fill="#ffffff" />
          <circle cx="520" cy="70" r="2" fill="#ffe7c2" />
          <circle cx="760" cy="130" r="1.5" fill="#ffffff" />
          <circle cx="1140" cy="90" r="2" fill="#ffffff" />
          <circle cx="1380" cy="150" r="1.5" fill="#ffe7c2" />
          <circle cx="1640" cy="85" r="2.5" fill="#ffffff" />
          <circle cx="1790" cy="160" r="1.5" fill="#ffe7c2" />
          <circle cx="410" cy="190" r="1.2" fill="#ffffff" />
          <circle cx="1520" cy="220" r="1.5" fill="#ffffff" />
        </g>

        {/* 4. Migratory Birds in Twilight Flight */}
        <g className="animate-bird-1" opacity="0.85">
          {/* Bird 1 */}
          <path
            d="M 420 320 Q 432 308 444 320 Q 456 308 468 320 Q 456 314 444 316 Q 432 314 420 320 Z"
            fill="#2c0c30"
          />
          {/* Bird 2 */}
          <path
            d="M 480 345 Q 490 334 500 345 Q 510 334 520 345 Q 510 340 500 342 Q 490 340 480 345 Z"
            fill="#2c0c30"
          />
          {/* Bird 3 */}
          <path
            d="M 370 340 Q 378 330 386 340 Q 394 330 402 340 Q 394 336 386 337 Q 378 336 370 340 Z"
            fill="#38103c"
          />
        </g>

        <g className="animate-bird-2" opacity="0.75">
          {/* Bird 4 */}
          <path
            d="M 1360 280 Q 1370 270 1380 280 Q 1390 270 1400 280 Q 1390 275 1380 277 Q 1370 275 1360 280 Z"
            fill="#2c0c30"
          />
          {/* Bird 5 */}
          <path
            d="M 1420 305 Q 1428 296 1436 305 Q 1444 296 1452 305 Q 1444 301 1436 302 Q 1428 301 1420 305 Z"
            fill="#2c0c30"
          />
          {/* Bird 6 */}
          <path
            d="M 1320 310 Q 1326 303 1332 310 Q 1338 303 1344 310 Q 1338 307 1332 308 Q 1326 307 1320 310 Z"
            fill="#3d1240"
          />
        </g>

        {/* 5. Far Mountain Ridges (Layer 1) */}
        <path
          d="M 0 740 L 160 670 L 320 720 L 510 610 L 680 690 L 880 570 L 1020 640 L 1220 530 L 1410 660 L 1580 580 L 1760 690 L 1920 630 L 1920 1080 L 0 1080 Z"
          fill="url(#farMountainsGrad)"
        />

        {/* Atmospheric Mist Layer 1 */}
        <rect
          x="0"
          y="640"
          width="1920"
          height="120"
          fill="url(#mistGrad1)"
          className="animate-mist-drift-1"
        />

        {/* 6. Mid Mountain Ridges (Layer 2) */}
        <path
          d="M 0 830 L 140 760 L 310 820 L 490 730 L 660 790 L 820 710 L 970 765 L 1150 675 L 1320 750 L 1490 690 L 1680 770 L 1840 720 L 1920 755 L 1920 1080 L 0 1080 Z"
          fill="url(#midMountainsGrad)"
        />

        {/* Atmospheric Mist Layer 2 */}
        <rect
          x="0"
          y="720"
          width="1920"
          height="90"
          fill="url(#mistGrad2)"
          className="animate-mist-drift-2"
        />
      </svg>
    </div>
  );
};

// =========================================================================
// LAYER 2: HERO FOREGROUND HILL & THE MUSICAL VOYAGER SILHOUETTE
// =========================================================================
export const HeroForegroundHill: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-full overflow-hidden select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1920 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover object-bottom"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Deep Foreground Silhouette Gradient */}
          <linearGradient id="fgHillGrad" x1="960" y1="120" x2="960" y2="800" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1a0724" />
            <stop offset="35%" stopColor="#100418" />
            <stop offset="100%" stopColor="#05010a" />
          </linearGradient>

          {/* Golden Rim Light along Hill Edge */}
          <linearGradient id="hillRimLight" x1="0" y1="0" x2="1920" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f59e42" stopOpacity="0.2" />
            <stop offset="30%" stopColor="#fed27d" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#ffd88a" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#f59e42" stopOpacity="0.15" />
          </linearGradient>

          {/* Vinyl Grooves Turntable Glow */}
          <radialGradient id="turntableGlow" cx="1230" cy="385" r="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8de7f2" stopOpacity="0.8" />
            <stop offset="45%" stopColor="#9b5ceb" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Main Rolling Hill Ground Silhouette */}
        <path
          d="M 0 460 Q 280 430 520 400 Q 760 370 980 385 Q 1180 395 1420 330 Q 1650 270 1920 360 L 1920 800 L 0 800 Z"
          fill="url(#fgHillGrad)"
        />

        {/* 2. Rim Light stroke highlighting the edge of the hill against the sunset */}
        <path
          d="M 0 460 Q 280 430 520 400 Q 760 370 980 385 Q 1180 395 1420 330 Q 1650 270 1920 360"
          stroke="url(#hillRimLight)"
          strokeWidth="3.5"
          fill="none"
        />

        {/* 3. Swaying Tall Grass & Wildflower Silhouettes (Left Ridge) */}
        <g className="animate-grass-sway-1" fill="#0d0314" opacity="0.95">
          <path d="M 120 450 Q 115 390 105 340 Q 115 390 125 450 Z" />
          <path d="M 132 452 Q 138 385 145 330 Q 140 388 137 452 Z" />
          <path d="M 150 455 Q 160 410 172 360 Q 158 412 154 455 Z" />
          <path d="M 210 445 Q 195 380 185 320 Q 200 382 215 445 Z" />
          <path d="M 230 448 Q 240 390 252 335 Q 238 392 234 448 Z" />
          <path d="M 340 430 Q 330 360 315 305 Q 335 362 345 430 Z" />
          <path d="M 360 432 Q 375 375 390 315 Q 372 378 365 432 Z" />
        </g>

        {/* 4. Swaying Tall Grass & Wildflower Silhouettes (Right Ridge) */}
        <g className="animate-grass-sway-2" fill="#0d0314" opacity="0.95">
          <path d="M 1520 315 Q 1510 250 1495 195 Q 1515 252 1525 315 Z" />
          <path d="M 1540 318 Q 1555 258 1572 205 Q 1552 260 1545 318 Z" />
          <path d="M 1680 290 Q 1665 220 1650 160 Q 1670 222 1685 290 Z" />
          <path d="M 1705 292 Q 1720 230 1735 170 Q 1718 232 1710 292 Z" />
          <path d="M 1810 325 Q 1800 260 1785 200 Q 1805 262 1815 325 Z" />
        </g>

        {/* 5. THE MUSICAL VOYAGER (Character Silhouette overlooking the soundscape) */}
        <g id="voyager-silhouette" transform="translate(1320, 160)" fill="#07020d">
          {/* Head & Straw Hat / Explorer Cap */}
          <ellipse cx="65" cy="52" rx="14" ry="16" />
          {/* Wide-brim traveler's hat matching the reference video */}
          <path d="M 32 46 Q 65 30 98 46 Q 65 38 32 46 Z" fill="#07020d" />
          <ellipse cx="65" cy="42" rx="18" ry="6" />

          {/* Over-ear Glowing Headphones */}
          <path d="M 49 46 Q 65 34 81 46" stroke="#8de7f2" strokeWidth="2.5" fill="none" />
          <circle cx="50" cy="54" r="5.5" fill="#8de7f2" filter="drop-shadow(0 0 6px #8de7f2)" />
          <circle cx="80" cy="54" r="5.5" fill="#8de7f2" filter="drop-shadow(0 0 6px #8de7f2)" />

          {/* Neck & Cloak Collar */}
          <path d="M 56 68 L 74 68 L 78 80 L 52 80 Z" />

          {/* Torso & Traveler's Wind-Coat */}
          <path d="M 44 80 L 86 80 L 98 175 L 32 175 Z" />

          {/* Backpack on Back (facing rightwards/horizon) */}
          <path d="M 28 85 Q 12 105 22 145 Q 32 155 42 150 L 40 88 Z" />
          {/* Sleeping mat / rolled blanket strapped to top of pack */}
          <rect x="18" y="76" width="22" height="10" rx="4" />

          {/* Legs & Boots */}
          {/* Left Leg */}
          <path d="M 48 175 L 42 245 L 36 248 L 56 250 L 58 245 L 56 175 Z" />
          {/* Right Leg (forward stance on rock) */}
          <path d="M 72 175 L 82 235 L 75 238 L 98 240 L 98 235 L 82 175 Z" />

          {/* Coat edge blowing gently in the wind */}
          <path d="M 32 165 Q 16 172 8 182 Q 22 176 34 175 Z" fill="#07020d" />
        </g>

        {/* 6. ILLUMINATED VINTAGE VINYL TURNTABLE ON STONE PEDESTAL */}
        <g id="vinyl-turntable" transform="translate(1440, 245)">
          {/* Weathered Stone Pedestal */}
          <path d="M 12 85 L 68 85 L 60 160 L 20 160 Z" fill="#0a0314" />
          <ellipse cx="40" cy="85" rx="30" ry="8" fill="#120520" />

          {/* Turntable Plinth */}
          <rect x="16" y="68" width="48" height="14" rx="3" fill="#18072b" stroke="#f59e42" strokeWidth="1" />

          {/* Glowing Vinyl Record */}
          <ellipse cx="36" cy="67" rx="18" ry="7" fill="#090816" stroke="#9b5ceb" strokeWidth="1.5" />
          <ellipse cx="36" cy="67" rx="10" ry="4" stroke="#8de7f2" strokeWidth="0.8" fill="none" opacity="0.8" />
          <circle cx="36" cy="67" r="2.5" fill="#f59e42" />

          {/* Tonearm */}
          <path d="M 54 65 L 42 66" stroke="#fed27d" strokeWidth="1.5" strokeLinecap="round" />

          {/* Floating Soundwave rings emitting from vinyl */}
          <ellipse
            cx="36"
            cy="67"
            rx="28"
            ry="11"
            stroke="#8de7f2"
            strokeWidth="1.2"
            fill="none"
            opacity="0.6"
            className="animate-ping"
            style={{ animationDuration: '3s' }}
          />
        </g>
      </svg>
    </div>
  );
};

// =========================================================================
// LAYER 3: TRANQUILITY WATERFALL & THE SOUND SANCTUARY
// =========================================================================
export const TranquilityWaterfallScene: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-full overflow-hidden select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1920 1080"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover object-center"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Deep Abyssal Teal Canyon Gradient */}
          <linearGradient id="canyonSkyGrad" x1="960" y1="0" x2="960" y2="1080" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#03141c" />
            <stop offset="35%" stopColor="#082933" />
            <stop offset="70%" stopColor="#0f444f" />
            <stop offset="100%" stopColor="#061f26" />
          </linearGradient>

          {/* Luminous Waterfall Stream Gradient */}
          <linearGradient id="waterfallStream" x1="0" y1="0" x2="0" y2="600" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>

          {/* Waterfall Basin Mist Pool Glow */}
          <radialGradient id="mistPoolGlow" cx="960" cy="740" r="380" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
            <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#082933" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#03141c" stopOpacity="0" />
          </radialGradient>

          {/* Amber Lantern Radiance */}
          <radialGradient id="lanternGlow" cx="440" cy="520" r="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
            <stop offset="25%" stopColor="#fde047" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#03141c" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Canyon Sky Backdrop */}
        <rect width="1920" height="1080" fill="url(#canyonSkyGrad)" />

        {/* 2. Distant Gorge Cliffs Silhouette */}
        <path
          d="M 0 0 L 520 0 L 460 420 L 620 620 L 540 820 L 0 1080 Z"
          fill="#061c24"
        />
        <path
          d="M 1920 0 L 1400 0 L 1460 440 L 1320 650 L 1390 850 L 1920 1080 Z"
          fill="#061c24"
        />

        {/* 3. Central Cascading Glowing Waterfall (3 tiers) */}
        <g id="waterfall-central">
          {/* Main vertical falls */}
          <path
            d="M 910 240 L 910 740 L 1010 740 L 1010 240 Z"
            fill="url(#waterfallStream)"
            opacity="0.85"
            className="animate-waterfall"
          />
          {/* Tier 1 Left Spout */}
          <path
            d="M 870 320 Q 860 520 890 740 L 920 740 Q 890 520 900 320 Z"
            fill="url(#waterfallStream)"
            opacity="0.75"
            className="animate-waterfall"
          />
          {/* Tier 2 Right Spout */}
          <path
            d="M 1010 340 Q 1040 540 1025 740 L 1055 740 Q 1070 540 1040 340 Z"
            fill="url(#waterfallStream)"
            opacity="0.7"
            className="animate-waterfall"
          />

          {/* Luminous Shimmer Lines along falls */}
          <line x1="930" y1="260" x2="930" y2="720" stroke="#ffffff" strokeWidth="2.5" opacity="0.9" strokeDasharray="30, 15" className="animate-waterfall" />
          <line x1="970" y1="250" x2="970" y2="730" stroke="#a7f3d0" strokeWidth="3" opacity="0.95" strokeDasharray="40, 20" className="animate-waterfall" />
          <line x1="990" y1="270" x2="990" y2="710" stroke="#ffffff" strokeWidth="2" opacity="0.85" strokeDasharray="25, 12" className="animate-waterfall" />
        </g>

        {/* 4. Rising Mist & Basin Glow */}
        <circle cx="960" cy="740" r="380" fill="url(#mistPoolGlow)" />
        <ellipse cx="960" cy="740" rx="320" ry="60" fill="#ffffff" fillOpacity="0.45" filter="blur(24px)" />

        {/* 5. Concentric Acoustic Ripples on Sound Lake */}
        <ellipse cx="960" cy="780" rx="140" ry="28" stroke="#38bdf8" strokeWidth="2" fill="none" opacity="0.8" className="animate-ping" style={{ animationDuration: '4s' }} />
        <ellipse cx="960" cy="780" rx="260" ry="52" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.5" className="animate-ping" style={{ animationDuration: '5.5s' }} />
        <ellipse cx="960" cy="780" rx="380" ry="76" stroke="#a7f3d0" strokeWidth="1" fill="none" opacity="0.3" className="animate-ping" style={{ animationDuration: '7s' }} />

        {/* 6. Ancient Overhanging Branches & Hanging Lantern */}
        <g id="mossy-branch-and-lantern">
          {/* Branch twisting from left cliff */}
          <path
            d="M 280 420 Q 380 460 450 490 Q 480 500 520 480"
            stroke="#041217"
            strokeWidth="28"
            strokeLinecap="round"
            fill="none"
          />
          {/* Hanging cord */}
          <line x1="440" y1="490" x2="440" y2="530" stroke="#fed27d" strokeWidth="2" />
          {/* Lantern Glow Field */}
          <circle cx="440" cy="545" r="140" fill="url(#lanternGlow)" />
          {/* Lantern Frame */}
          <polygon points="432,530 448,530 452,555 428,555" fill="#041217" />
          <rect x="430" y="535" width="20" height="20" fill="#fde047" rx="3" filter="drop-shadow(0 0 10px #f59e0b)" />
          <polygon points="426,555 454,555 440,566" fill="#041217" />
        </g>

        {/* 7. THE ELDER LISTENER / SAGE SEATED ON RIVER TURTLE (From reference video) */}
        <g id="elder-listener" transform="translate(480, 680)">
          {/* Giant River Turtle Shell / Ancient Rock Base */}
          <ellipse cx="80" cy="110" rx="95" ry="38" fill="#05171e" stroke="#0f444f" strokeWidth="2" />
          <path d="M 10 110 Q 80 75 160 110" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />

          {/* Elder Character Silhouette */}
          {/* Body seated in lotus / relaxed listening posture */}
          <ellipse cx="75" cy="78" rx="20" ry="16" fill="#030d12" />
          {/* Head & Straw Hat */}
          <circle cx="75" cy="52" r="10" fill="#030d12" />
          <ellipse cx="75" cy="46" rx="18" ry="5" fill="#030d12" />
          {/* Long Bamboo Staff / Fishing Rod extending over water */}
          <line x1="82" y1="65" x2="190" y2="35" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          {/* Line dropping into ripples */}
          <line x1="190" y1="35" x2="190" y2="105" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="4, 4" />
          {/* Water ripple at line contact */}
          <ellipse cx="190" cy="105" rx="14" ry="4" stroke="#38bdf8" strokeWidth="1" fill="none" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
};

// =========================================================================
// LAYER 4: BIODIVERSITY ENCHANTED FOREST & THE ILLUMINATED SONIC STAG
// =========================================================================
export const BiodiversityForestScene: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-full overflow-hidden select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1920 1080"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover object-center"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Twilight Deep Forest Atmosphere */}
          <linearGradient id="forestSkyGrad" x1="960" y1="0" x2="960" y2="1080" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#050212" />
            <stop offset="30%" stopColor="#120524" />
            <stop offset="65%" stopColor="#290b42" />
            <stop offset="100%" stopColor="#080214" />
          </linearGradient>

          {/* Bioluminescent Stag Antlers Radiance */}
          <radialGradient id="stagAntlerGlow" cx="1380" cy="560" r="260" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#9b5ceb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#050212" stopOpacity="0" />
          </radialGradient>

          {/* Glowing Mushroom Spores Glow */}
          <radialGradient id="mushroomCyanGlow" cx="540" cy="850" r="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="45%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#050212" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mushroomPurpleGlow" cx="640" cy="880" r="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#9333ea" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#050212" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Deep Violet Forest Canopy Backdrop */}
        <rect width="1920" height="1080" fill="url(#forestSkyGrad)" />

        {/* 2. Ancient Twisted Tree Silhouettes (Left & Right) */}
        <path
          d="M 0 0 L 340 0 Q 300 320 220 540 Q 140 760 0 1080 Z"
          fill="#080214"
        />
        <path
          d="M 1920 0 L 1580 0 Q 1640 340 1710 560 Q 1800 780 1920 1080 Z"
          fill="#080214"
        />

        {/* 3. Glowing Weeping Willow Light Tendrils / Bioluminescent Vines */}
        <g opacity="0.85">
          <path d="M 260 0 Q 240 280 270 520" stroke="#8de7f2" strokeWidth="2.5" strokeOpacity="0.75" fill="none" />
          <path d="M 290 0 Q 320 240 290 480" stroke="#c084fc" strokeWidth="2" strokeOpacity="0.65" fill="none" />
          <path d="M 320 0 Q 340 290 310 560" stroke="#a7f3d0" strokeWidth="2" strokeOpacity="0.8" fill="none" />
          <path d="M 1640 0 Q 1660 260 1630 510" stroke="#8de7f2" strokeWidth="2.5" strokeOpacity="0.7" fill="none" />
          <path d="M 1680 0 Q 1650 310 1670 540" stroke="#c084fc" strokeWidth="2" strokeOpacity="0.8" fill="none" />
        </g>

        {/* 4. Bioluminescent Forest Floor & Illuminated Mushrooms */}
        <path
          d="M 0 880 Q 480 840 960 860 Q 1440 880 1920 840 L 1920 1080 L 0 1080 Z"
          fill="#05010d"
        />

        {/* Mushroom 1: Giant Cyan Cap */}
        <circle cx="540" cy="850" r="140" fill="url(#mushroomCyanGlow)" />
        <g id="mushroom-cyan" transform="translate(520, 810)">
          {/* Stalk */}
          <path d="M 16 35 L 26 35 L 30 90 L 12 90 Z" fill="#0c1e2b" stroke="#38bdf8" strokeWidth="1" />
          {/* Glowing Cap */}
          <path d="M 0 35 Q 21 0 42 35 Z" fill="#38bdf8" filter="drop-shadow(0 0 14px #06b6d4)" />
          {/* Spots on Cap */}
          <circle cx="14" cy="22" r="3" fill="#ffffff" />
          <circle cx="28" cy="18" r="3.5" fill="#ffffff" />
          <circle cx="21" cy="28" r="2.5" fill="#ffffff" />
        </g>

        {/* Mushroom 2: Violet Cap */}
        <circle cx="640" cy="880" r="120" fill="url(#mushroomPurpleGlow)" />
        <g id="mushroom-purple" transform="translate(620, 840)">
          <path d="M 14 30 L 22 30 L 26 75 L 10 75 Z" fill="#1b082e" stroke="#c084fc" strokeWidth="1" />
          <path d="M 0 30 Q 18 2 36 30 Z" fill="#c084fc" filter="drop-shadow(0 0 12px #9333ea)" />
          <circle cx="12" cy="18" r="2.5" fill="#ffffff" />
          <circle cx="24" cy="15" r="3" fill="#ffffff" />
        </g>

        {/* 5. THE ILLUMINATED SONIC STAG (Spotted Deer with glowing crystal antlers) */}
        <g id="sonic-stag" transform="translate(1220, 520)">
          {/* Antlers Radiance Halo */}
          <circle cx="160" cy="40" r="190" fill="url(#stagAntlerGlow)" />

          {/* Deer Body (Grazing gracefully towards the left) */}
          {/* Torso */}
          <ellipse cx="110" cy="150" rx="65" ry="32" fill="#090317" />
          {/* Spotted Fur bioluminescent flecks */}
          <circle cx="85" cy="145" r="2.5" fill="#8de7f2" filter="drop-shadow(0 0 4px #8de7f2)" />
          <circle cx="105" cy="140" r="2.5" fill="#8de7f2" filter="drop-shadow(0 0 4px #8de7f2)" />
          <circle cx="125" cy="148" r="2.5" fill="#8de7f2" filter="drop-shadow(0 0 4px #8de7f2)" />
          <circle cx="95" cy="155" r="2" fill="#fed27d" filter="drop-shadow(0 0 4px #fed27d)" />
          <circle cx="118" cy="158" r="2" fill="#fed27d" filter="drop-shadow(0 0 4px #fed27d)" />

          {/* Slender Legs */}
          {/* Front Left */}
          <path d="M 68 175 L 62 270 L 68 270 L 74 175 Z" fill="#070212" />
          {/* Front Right */}
          <path d="M 80 175 L 75 270 L 81 270 L 86 175 Z" fill="#070212" />
          {/* Back Left */}
          <path d="M 148 175 L 158 270 L 152 270 L 140 175 Z" fill="#070212" />
          {/* Back Right */}
          <path d="M 160 175 L 172 270 L 166 270 L 152 175 Z" fill="#070212" />

          {/* Neck & Head dipping down to graze */}
          <path d="M 60 145 L 30 115 L 18 135 L 45 165 Z" fill="#090317" />
          <ellipse cx="22" cy="122" rx="14" ry="9" fill="#090317" />
          {/* Ears */}
          <ellipse cx="32" cy="112" rx="6" ry="12" transform="rotate(-30 32 112)" fill="#090317" />

          {/* CRYSTALLINE GLOWING ANTLERS (Emitting Sound Waves) */}
          {/* Main Left Antler Beam */}
          <path
            d="M 28 112 Q 20 80 0 55 M 12 70 Q 2 62 -10 65 M 18 82 Q 8 95 2 105"
            stroke="#8de7f2"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            filter="drop-shadow(0 0 8px #38bdf8)"
          />
          {/* Main Right Antler Beam */}
          <path
            d="M 34 110 Q 32 75 25 45 M 30 80 Q 40 65 48 58 M 28 65 Q 22 45 15 35"
            stroke="#fed27d"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            filter="drop-shadow(0 0 8px #f59e0b)"
          />
        </g>

        {/* 6. Rising Bioluminescent Fireflies / Spores */}
        <g id="fireflies">
          <circle cx="480" cy="780" r="3" fill="#8de7f2" filter="drop-shadow(0 0 8px #8de7f2)" style={{ animation: 'firefly-float 5s ease-in-out infinite 0.2s' }} />
          <circle cx="560" cy="740" r="2.5" fill="#fed27d" filter="drop-shadow(0 0 8px #fed27d)" style={{ animation: 'firefly-float 6s ease-in-out infinite 1.2s' }} />
          <circle cx="680" cy="790" r="3.5" fill="#a7f3d0" filter="drop-shadow(0 0 8px #a7f3d0)" style={{ animation: 'firefly-float 5.5s ease-in-out infinite 2.1s' }} />
          <circle cx="820" cy="720" r="2" fill="#c084fc" filter="drop-shadow(0 0 8px #c084fc)" style={{ animation: 'firefly-float 6.5s ease-in-out infinite 0.8s' }} />
          <circle cx="1120" cy="760" r="3" fill="#8de7f2" filter="drop-shadow(0 0 8px #8de7f2)" style={{ animation: 'firefly-float 5.8s ease-in-out infinite 1.7s' }} />
          <circle cx="1280" cy="710" r="2.5" fill="#fed27d" filter="drop-shadow(0 0 8px #fed27d)" style={{ animation: 'firefly-float 6.2s ease-in-out infinite 2.5s' }} />
          <circle cx="1450" cy="750" r="3" fill="#a7f3d0" filter="drop-shadow(0 0 8px #a7f3d0)" style={{ animation: 'firefly-float 5.2s ease-in-out infinite 0.5s' }} />
        </g>
      </svg>
    </div>
  );
};
