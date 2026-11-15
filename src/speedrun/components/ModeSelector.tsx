import React from 'react';
import {
  Shuffle,
  Keyboard,
  Zap,
  Brain,
  Bomb,
  Gamepad2,
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
      description: 'Get a completely random challenge from any category. Zero prep time.',
      icon: Shuffle,
      color: 'from-[#84cc16] to-[#a3e635]',
      tag: 'Classic',
    },
    {
      id: 'brain_glitch' as SpeedrunMode,
      title: 'Brain Glitch',
      subtitle: 'Stroop Mind Trap',
      description: 'Your brain fights itself! Match the ink font color or written word under intense pressure.',
      icon: Brain,
      color: 'from-[#a3e635] to-[#bef264]',
      tag: 'Mind Hack',
    },
    {
      id: 'wire_defuse' as SpeedrunMode,
      title: 'Defuse The Bomb',
      subtitle: 'Tactical Wire Cut',
      description: 'Read the high-stakes defusal directive and snip the exact wire before detonation.',
      icon: Bomb,
      color: 'from-[#ef4444] to-[#dc2626]',
      tag: 'High Stakes',
    },
    {
      id: 'reaction' as SpeedrunMode,
      title: 'Reaction Speedrun',
      subtitle: 'Sub-200ms Reflexes',
      description: 'Wait for the electric green signal and click before you blink. False starts disqualify!',
      icon: Zap,
      color: 'from-[#84cc16] to-[#65a30d]',
      tag: 'Reflex',
    },
    {
      id: 'typing' as SpeedrunMode,
      title: 'Typing Speedrun',
      subtitle: 'Finger Burner',
      description: 'Type random chaotic sentences and tongue twisters at blistering speed with zero typos.',
      icon: Keyboard,
      color: 'from-[#38bdf8] to-[#0284c7]',
      tag: 'WPM Test',
    },
    {
      id: 'memory' as SpeedrunMode,
      title: 'Memory Speedrun',
      subtitle: 'Emoji Recall',
      description: 'Memorize high-speed emoji sequences and recall them under intense countdown pressure.',
      icon: Brain,
      color: 'from-[#a3e635] to-[#4ade80]',
      tag: 'Memory',
    },
    {
      id: 'precision' as SpeedrunMode,
      title: 'Precision Speedrun',
      subtitle: 'Pixel Accuracy',
      description: 'Find odd emojis in massive grids and click moving micro-targets with aimbot accuracy.',
      icon: Crosshair,
      color: 'from-[#ef4444] to-[#f87171]',
      tag: 'Aim',
    },
    {
      id: 'impossible' as SpeedrunMode,
      title: 'Impossible Speedrun',
      subtitle: 'Expect The Unexpected',
      description: 'Survive cursor-dodging buttons, reverse psychology, and hyper clicker chaos.',
      icon: Skull,
      color: 'from-[#ef4444] to-[#991b1b]',
      tag: 'Hardcore',
    },
    {
      id: 'daily' as SpeedrunMode,
      title: 'Daily Challenge',
      subtitle: 'Global Drop',
      description: 'One synchronized challenge every day for players worldwide. Build your streak.',
      icon: Calendar,
      color: 'from-[#84cc16] to-[#ef4444]',
      tag: 'Streaks',
    },
    {
      id: 'endless' as SpeedrunMode,
      title: 'Endless Gauntlet',
      subtitle: 'Survival Mode',
      description: 'Continuous random speedruns with decreasing timers. One mistake ends the run.',
      icon: Infinity,
      color: 'from-[#ef4444] to-[#a3e635]',
      tag: 'Gauntlet',
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 select-none">
      
      {/* Title Header */}
      <div className="text-center space-y-2 mb-10">
        <p className="text-xs font-mono tracking-[0.3em] uppercase text-[#a3e635] font-black">
          Choose Your Poison
        </p>
        <h2 className="font-cinzel text-3xl sm:text-5xl font-black uppercase text-white tracking-wider">
          GAME MODES
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Every mode is a test of speed, instinct, and nerves. Pick a discipline and set a world record.
        </p>
      </div>

      {/* Grid of Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => {
                speedrunAudio.playClick();
                onSelectMode(m.id);
              }}
              className="group relative p-6 rounded-3xl bg-[#0e1117] hover:bg-[#141820] border-2 border-[#84cc16]/30 hover:border-[#a3e635] transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_0_35px_rgba(163,230,53,0.3)] hover:-translate-y-1.5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${m.color} flex items-center justify-center text-black shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-white/5 text-[#a3e635] font-bold border border-[#84cc16]/30">
                    {m.tag}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-[#a3e635] transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-xs font-mono text-[#bef264]/80 mb-2 font-semibold">
                    {m.subtitle}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    {m.description}
                  </p>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between text-xs font-black font-mono text-[#a3e635] uppercase tracking-wider">
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
