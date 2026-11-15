
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, CookiePreferences } from './types';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { CookieBanner } from './components/common/CookieBanner';
import { LandingPage } from './components/landing/LandingPage';
import { LanguageSelectionView } from './components/game/LanguageSelectionView';
import { GameView } from './components/game/GameView';
import { DailyChallengeView } from './components/daily/DailyChallengeView';
import { MultiplayerView } from './components/multiplayer/MultiplayerView';
import { DiscoveryView } from './components/discovery/DiscoveryView';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { FriendsView } from './components/friends/FriendsView';
import { ProfileView } from './components/profile/ProfileView';
import { LegalCentre } from './components/legal/LegalCentre';
import { AdminPanel } from './components/admin/AdminPanel';
import { AuthModal } from './components/auth/AuthModal';
import { OnboardingGuide } from './components/common/OnboardingGuide';
import { gameEngine } from './services/gameEngine';
import { privacyConsent } from './services/privacyConsent';
import { audioEngine } from './services/audioEngine';
import { musicCatalogue } from './services/musicCatalogue';
import { authService } from './services/authService';
import { SpeedrunApp } from './speedrun/SpeedrunApp';
import { MemeCombatApp } from './memekombat/MemeCombatApp';

const LazyUniverseScene = React.lazy(() =>
  import('./components/scene/UniverseScene').then((module) => ({ default: module.UniverseScene }))
);

const DISCOVERY_LANGUAGES = [
  'English',
  'Telugu',
  'Hindi',
  'Tamil',
  'Malayalam',
  'Kannada',
  'Bengali',
  'Punjabi',
  'Spanish',
];

export default function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [userProfile, setUserProfile] = useState(gameEngine.getUserProfile());
  const [cookiePrefs, setCookiePrefs] = useState<CookiePreferences>(
    privacyConsent.getPreferences()
  );

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalInitialTab, setLegalInitialTab] = useState('privacy');
  const [cookieModalOpen, setCookieModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  // Subscribe to cookie preference updates.
  useEffect(() => {
    const unsubCookies = privacyConsent.subscribe((prefs) => {
      setCookiePrefs(prefs);
    });

    return () => unsubCookies();
  }, []);

  // Open the auth modal for successful callbacks, recovery, and provider cancellation/errors.
  useEffect(() => {
    const unsubAuth = authService.subscribe((state) => {
      if (state.authView === 'verified_success' || state.authView === 'reset_password' || state.callbackFeedback) {
        setAuthModalOpen(true);
      }
      refreshProfile();
    });

    return () => unsubAuth();
  }, []);

  // Sync URL query/hash to support direct speedrun or meme combat access: ?view=speedrun, ?view=memecombat, etc.
  useEffect(() => {
    const checkCustomViews = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash.replace('#', '');
        const view = params.get('view');
        if (view === 'speedrun' || hash === 'speedrun' || window.location.pathname === '/speedrun') {
          setCurrentView('speedrun');
        } else if (
          view === 'memecombat' ||
          view === 'memebattle' ||
          hash === 'memecombat' ||
          hash === 'memebattle' ||
          window.location.pathname === '/memecombat'
        ) {
          setCurrentView('memecombat');
        }
      } catch {}
    };

    checkCustomViews();
    window.addEventListener('popstate', checkCustomViews);
    window.addEventListener('hashchange', checkCustomViews);
    return () => {
      window.removeEventListener('popstate', checkCustomViews);
      window.removeEventListener('hashchange', checkCustomViews);
    };
  }, []);

  const refreshProfile = () => {
    setUserProfile(gameEngine.getUserProfile());
  };

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(
        'songverse_preferred_languages_v1'
      );

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Use the default language if local storage is unavailable.
    }

    return ['English'];
  });

  const handleNavigate = (view: string, mode?: GameMode) => {
    audioEngine.stop();

    if (mode) {
      setGameMode(mode);
    }

    setCurrentView(view);
    refreshProfile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartPlay = (mode: GameMode = 'classic') => {
    audioEngine.stop();
    setGameMode(mode);
    setCurrentView('language_select');
    refreshProfile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartGameWithLanguages = (languages: string[]) => {
    audioEngine.stop();
    setSelectedLanguages(languages);
    setCurrentView('game');
    refreshProfile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLegal = (tab: string = 'privacy') => {
    setLegalInitialTab(tab);
    setLegalModalOpen(true);
  };

  // Dedicated Standalone Full-Screen View for SPEEDRUN EVERYTHING
  if (currentView === 'speedrun') {
    return (
      <SpeedrunApp
        onExitToSongverse={() => handleNavigate('landing')}
        onOpenMemeCombat={() => handleNavigate('memecombat')}
      />
    );
  }

  // Dedicated Standalone Full-Screen View for MEME KOMBAT
  if (currentView === 'memecombat' || currentView === 'memebattle') {
    return (
      <MemeCombatApp
        onExitToSongverse={() => handleNavigate('landing')}
        onOpenSpeedrun={() => handleNavigate('speedrun')}
      />
    );
  }

  return (
    <div className="sv-app-shell min-h-screen flex flex-col bg-[var(--app-bg)] text-slate-900 dark:text-slate-100 font-sans selection:bg-sv-red/20 selection:text-sv-red transition-colors duration-200">

      <React.Suspense fallback={<div className="sv-universe-scene__fallback" aria-hidden="true" />}>
        <LazyUniverseScene active={currentView === 'landing'} />
      </React.Suspense>

      {/* Top 3-Zone Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        userScore={userProfile.totalScore}
        streak={userProfile.currentStreak}
        isGuest={userProfile.isGuest}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenGuide={() => setGuideModalOpen(true)}
      />

      {/* Main View Router */}
      <main className={`flex-1 sv-route-view sv-route-${currentView}`}>
        {currentView === 'landing' && (
          <LandingPage
            onStartPlay={handleStartPlay}
            onNavigate={handleNavigate}
            onOpenGuide={() => setGuideModalOpen(true)}
          />
        )}

        {currentView === 'language_select' && (
          <LanguageSelectionView
            onStartGame={handleStartGameWithLanguages}
            onBackToHome={() => handleNavigate('landing')}
          />
        )}

        {currentView === 'game' && (
          <GameView
            mode={gameMode}
            selectedLanguages={selectedLanguages}
            onChangeLanguages={() => {
              setCurrentView('language_select');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateHome={() => handleNavigate('landing')}
            onNavigateLeaderboard={() => handleNavigate('leaderboard')}
          />
        )}

        {currentView === 'daily' && (
          <DailyChallengeView
            onStartDaily={() => handleStartPlay('daily')}
            onNavigateLeaderboard={() => handleNavigate('leaderboard')}
          />
        )}

        {currentView === 'multiplayer' && (
          <MultiplayerView
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('landing')}
          />
        )}

        {currentView === 'discovery' && (
          <DiscoveryView />
        )}

        {currentView === 'friends' && (
          <FriendsView
            onOpenAuth={() => setAuthModalOpen(true)}
            onJoinRoom={(code) => {
              setCurrentView('multiplayer');
            }}
          />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardView />
        )}

        {currentView === 'profile' && (
          <ProfileView
            onDataReset={refreshProfile}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Global Accessible Footer */}
      <Footer
        onOpenLegal={handleOpenLegal}
        onOpenCookies={() => setCookieModalOpen(true)}
        onOpenAdmin={() => setAdminModalOpen(true)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          if (authService.getState().callbackFeedback) authService.setAuthView('login');
        }}
        onSuccess={() => refreshProfile()}
      />

      {/* Cookie Consent Banner & Modal */}
      <CookieBanner
        preferences={cookiePrefs}
        onAcceptAll={() => privacyConsent.acceptAll()}
        onRejectOptional={() => privacyConsent.rejectOptional()}
        onSaveCustom={(f, a) => privacyConsent.saveCustom(f, a)}
        isModalOpen={cookieModalOpen}
        onCloseModal={() => setCookieModalOpen(false)}
        onOpenModal={() => setCookieModalOpen(true)}
      />

      {/* Legal & Privacy Centre Modal */}
      {legalModalOpen && (
        <LegalCentre
          initialTab={legalInitialTab}
          onClose={() => setLegalModalOpen(false)}
          onOpenCookies={() => {
            setLegalModalOpen(false);
            setCookieModalOpen(true);
          }}
          onDataReset={refreshProfile}
        />
      )}

      {/* Administration & Test Runner Modal */}
      {adminModalOpen && (
        <AdminPanel
          onClose={() => {
            setAdminModalOpen(false);
            refreshProfile();
          }}
        />
      )}

      {/* Interactive Onboarding & Game Guide (Optional, non-intrusive) */}
      <OnboardingGuide
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
