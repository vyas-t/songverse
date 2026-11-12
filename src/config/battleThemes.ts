/**
 * SongVerse Curated Battle Themes & Showdowns
 */

export interface BattleTheme {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  description: string;
  gradient: string;
  visualizerTheme: 'cyberpunk' | 'vinyl' | 'cassette';
  featuredArtists: string[];
  genreMatch: string[];
}

export const CURATED_BATTLE_THEMES: BattleTheme[] = [
  {
    id: 'pop_2010s',
    name: '2010s Pop Anthems',
    tagline: 'The decade that dominated the charts',
    emoji: '🌟',
    description: 'Iconic billboard chart-toppers from Taylor Swift, Bruno Mars, Ed Sheeran, and Dua Lipa.',
    gradient: 'from-pink-500 via-rose-500 to-amber-500',
    visualizerTheme: 'cyberpunk',
    featuredArtists: ['Taylor Swift', 'Ed Sheeran', 'Ariana Grande', 'Bruno Mars', 'Dua Lipa'],
    genreMatch: ['Pop', 'Dance-Pop', 'Electropop']
  },
  {
    id: 'rock_classics',
    name: 'Classic Rock & Grunge',
    tagline: 'Overdriven guitars & legendary anthems',
    emoji: '🎸',
    description: 'Ripping solos and arena anthems from Queen, Nirvana, AC/DC, and Linkin Park.',
    gradient: 'from-amber-600 via-red-600 to-zinc-900',
    visualizerTheme: 'vinyl',
    featuredArtists: ['Queen', 'Nirvana', 'AC/DC', 'Linkin Park', 'Guns N Roses'],
    genreMatch: ['Rock', 'Hard Rock', 'Grunge', 'Alternative']
  },
  {
    id: 'hiphop_heavyweights',
    name: 'Hip-Hop & Trap Beats',
    tagline: 'Hard 808s, clever wordplay & flow',
    emoji: '🔥',
    description: 'Bangers and legendary verses from Drake, Eminem, Kendrick Lamar, and Travis Scott.',
    gradient: 'from-amber-500 via-orange-600 to-slate-900',
    visualizerTheme: 'cassette',
    featuredArtists: ['Drake', 'Eminem', 'Kendrick Lamar', 'Travis Scott'],
    genreMatch: ['Hip-Hop', 'Rap', 'Trap']
  },
  {
    id: 'bollywood_melodies',
    name: 'Bollywood Golden Hits',
    tagline: 'Timeless melodies & romantic anthems',
    emoji: '🎬',
    description: 'Unforgettable Indian cinematic masterpieces from Arijit Singh, A.R. Rahman, and Pritam.',
    gradient: 'from-orange-500 via-amber-500 to-emerald-600',
    visualizerTheme: 'vinyl',
    featuredArtists: ['Arijit Singh', 'A.R. Rahman', 'Shreya Ghoshal', 'Pritam'],
    genreMatch: ['Bollywood', 'Hindi Pop', 'Soundtrack']
  },
  {
    id: 'edm_bass',
    name: 'EDM & Festival Drops',
    tagline: 'Massive build-ups & stadium drops',
    emoji: '⚡',
    description: 'Festival energy from Avicii, Calvin Harris, Martin Garrix, and The Chainsmokers.',
    gradient: 'from-cyan-400 via-blue-600 to-violet-800',
    visualizerTheme: 'cyberpunk',
    featuredArtists: ['Avicii', 'Calvin Harris', 'Martin Garrix', 'The Chainsmokers'],
    genreMatch: ['EDM', 'House', 'Progressive House', 'Electronic']
  },
  {
    id: 'anime_gaming',
    name: 'Anime & Gaming Soundtracks',
    tagline: 'High-octane OSTs & opening themes',
    emoji: '🎌',
    description: 'Epic anime battle themes and memorable game soundtracks from LiSA, RADWIMPS, and Toby Fox.',
    gradient: 'from-purple-500 via-indigo-600 to-sky-500',
    visualizerTheme: 'cassette',
    featuredArtists: ['LiSA', 'RADWIMPS', 'Kenshi Yonezu', 'Toby Fox'],
    genreMatch: ['J-Pop', 'Soundtrack', 'Anime OST']
  }
];
