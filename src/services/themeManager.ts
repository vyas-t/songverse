export type ThemePreference = 'dark' | 'light' | 'system';

const THEME_STORAGE_KEY = 'songverse_theme_preference_v2';

class ThemeManagerService {
  private preference: ThemePreference = 'system';
  private listeners: Set<(theme: ThemePreference, effectiveTheme: 'dark' | 'light') => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        this.preference = stored;
      }
    } catch {
      this.preference = 'system';
    }

    this.apply();

    // Listen for OS system theme changes
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.preference === 'system') {
          this.apply();
        }
      });
    } catch {
      // Ignored
    }
  }

  public getPreference(): ThemePreference {
    return this.preference;
  }

  public getEffectiveTheme(): 'dark' | 'light' {
    if (this.preference === 'dark') return 'dark';
    if (this.preference === 'light') return 'light';
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  public setPreference(pref: ThemePreference) {
    this.preference = pref;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // Storage unavailable
    }
    this.apply();
  }

  public subscribe(fn: (theme: ThemePreference, effectiveTheme: 'dark' | 'light') => void): () => void {
    this.listeners.add(fn);
    fn(this.preference, this.getEffectiveTheme());
    return () => this.listeners.delete(fn);
  }

  private apply() {
    if (typeof document === 'undefined') return;
    const effective = this.getEffectiveTheme();
    const root = document.documentElement;

    root.setAttribute('data-theme', effective);
    if (effective === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    this.listeners.forEach(fn => {
      try {
        fn(this.preference, effective);
      } catch {
        // Ignored
      }
    });
  }
}

export const themeManager = new ThemeManagerService();
