import React from 'react';
import {
  Shuffle,
  Keyboard,
  Zap,
  Brain,
  Calculator,
  Crosshair,
  Skull,
  Calendar,
  Infinity,
  Play
} from 'lucide-react';
import { SpeedrunMode } from '../types';
import { speedrunAudio } from '../audio';

interface ModeSelectorProps {
  onSelectMode: (mode: SpeedrunMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelectMode }) => {
  const modes = [
    {
      id: 'random' as SpeedrunMode,
      title: 'Random Speedrun',
      subtitle: 'Completely Unpredictable',
      description: 'Get a completely random challenge from any category. No prep time.',
      icon: Shuffle,
      color: 'from-amber-500 to-rose-500',
      tag: 'Classic',
    },
    {
      id: 'typing' as SpeedrunMode,
      title: 'Typing Speedrun',
      subtitle: 'Finger Burner',
      description: 'Type random tongue twisters and chaotic sentences with zero typos.',
      icon: Keyboard,
      color: 'from-cyan-400 to-blue-600',
      tag: 'WPM Test',
    },
    {
      id: 'reaction' as SpeedrunMode,
      title: 'Reaction Speedrun',
      subtitle: 'Sub-200ms Reflexes',
      description: 'Wait for the electric green signal and click before you blink.',
      icon: Zap,
      color: 'from-emerald-400 to-teal-600',
      tag: 'Reflex',
    },
    {
      id: 'memory' as SpeedrunMode,
      title: 'Memory Speedrun',
      subtitle: 'Emoji Recall',
      description: 'Memorize high-speed emoji sequences and recall them under pressure.',
      icon: Brain,
      color: 'from-purple-400 to-indigo-600',
      tag: 'Memory',
    },
    {
      id: 'math' as SpeedrunMode,
      title: 'Math Speedrun',
      subtitle: 'Rapid Arithmetic',
      description: 'Calculate and solve mental equations before the timer zeroes out.',
      icon: Calculator,
      color: 'from-rose-400 to-pink-600',
      tag: 'Brain',
    },
    {
      id: 'precision' as SpeedrunMode,
      title: 'Precision Speedrun',
      subtitle: 'Pixel Accuracy',
      description: 'Find odd emojis in massive grids and click moving micro-targets.',
      icon: Crosshair,
      color: 'from-amber-400 to-orange-600',
      tag: 'Aim',
    },
    {
      id: 'impossible' as SpeedrunMode,
      title: 'Impossible Speedrun',
      subtitle: 'Expect The Unexpected',
      description: 'Survive cursor-dodging buttons, reverse psychology, and chaos.',
      icon: Skull,
      color: 'from-red-500 to-rose-700',
      tag: 'Hardcore',
    },
    {
      id: 'daily' as SpeedrunMode,
      title: 'Daily Challenge',
      subtitle: 'Global Drop',
      description: 'One synchronized challenge every day for players worldwide.',
      icon: Calendar,
      color: 'from-yellow-400 to-amber-600',
      tag: 'Streaks',
    },
    {
      id: 'endless' as SpeedrunMode,
      title: 'Endless Gauntlet',
      subtitle: 'Survival Mode',
      description: 'Continuous random speedruns with decreasing timers. Do not fail.',
      icon: Infinity,
      color: 'from-fuchsia-500 to-purple-800',
      tag: 'Gauntlet',
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 select-none">
      
      {/* Title Header */}
      <div className="text-center space-y-2 mb-10">
        <p className="text-xs font-mono tracking-[0.3em] uppercase text-amber-400 font-bold">
          Choose Your Poison
        </p>
        <h2 className="font-cinzel text-3xl sm:text-5xl font-black uppercase text-white tracking-wider">
          GAME MODES
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Every mode is a test of speed, instinct, and nerves. Pick a discipline and set a record.
        </p>
      </div>

      {/* Grid of 9 Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <div
              key={mode.id}
              onClick={() => {
                speedrunAudio.playClick();
                onSelectMode(mode.id);
              }}
              className="group relative p-6 rounded-3xl bg-black/60 hover:bg-black/80 backdrop-blur-xl border-2 border-purple-500/30 hover:border-amber-400/80 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_0_35px_rgba(245,158,66,0.3)] hover:-translate-y-1.5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${mode.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 font-bold border border-white/10">
                    {mode.tag}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                    {mode.title}
                  </h3>
                  <p className="text-xs font-mono text-purple-300/80 mb-2 font-semibold">
                    {mode.subtitle}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    {mode.description}
                  </p>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between text-xs font-black font-mono text-amber-400 uppercase tracking-wider">
                <span>Speedrun Now</span>
                <Play className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
