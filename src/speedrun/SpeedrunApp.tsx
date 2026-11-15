import React, { useState } from 'react';
import { SpeedrunMode } from './types';
import { SpeedrunNavbar } from './components/SpeedrunNavbar';
import { GameArena } from './components/GameArena';
import { ModeSelector } from './components/ModeSelector';
import { DailySpeedrunView } from './components/DailySpeedrunView';
import { SpeedrunLeaderboard } from './components/SpeedrunLeaderboard';
import { SpeedrunProfile } from './components/SpeedrunProfile';

interface SpeedrunAppProps {
  onExitToSongverse: () => void;
}

export const SpeedrunApp: React.FC<SpeedrunAppProps> = ({ onExitToSongverse }) => {
  const [currentTab, setCurrentTab] = useState<string>('arena');
  const [activeMode, setActiveMode] = useState<SpeedrunMode>('random');

  const handleSelectModeAndPlay = (mode: SpeedrunMode) => {
    setActiveMode(mode);
    setCurrentTab('arena');
  };

  const handleStartDaily = () => {
    setActiveMode('daily');
    setCurrentTab('arena');
  };

  return (
    <div className="min-h-screen w-full bg-[#08090a] text-white flex flex-col font-sans selection:bg-[#a3e635]/30 selection:text-[#bef264] overflow-x-hidden">
      
      {/* Dynamic Animated Ambient Background Glows (60% Lime / 20% Dark / 20% Red) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-[#84cc16]/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-[#ef4444]/12 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 left-1/3 w-[550px] h-[550px] bg-[#a3e635]/10 rounded-full blur-[150px]" />
      </div>

      {/* Speedrun Navbar */}
      <SpeedrunNavbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onExitToSongverse={onExitToSongverse}
      />

      {/* View Router */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start pb-16">
        {currentTab === 'arena' && (
          <GameArena
            mode={activeMode}
            onSelectMode={handleSelectModeAndPlay}
            onViewLeaderboard={() => setCurrentTab('leaderboard')}
          />
        )}

        {currentTab === 'modes' && (
          <ModeSelector onSelectMode={handleSelectModeAndPlay} />
        )}

        {currentTab === 'daily' && (
          <DailySpeedrunView onStartDaily={handleStartDaily} />
        )}

        {currentTab === 'leaderboard' && (
          <SpeedrunLeaderboard />
        )}

        {currentTab === 'profile' && (
          <SpeedrunProfile />
        )}
      </main>

    </div>
  );
};
