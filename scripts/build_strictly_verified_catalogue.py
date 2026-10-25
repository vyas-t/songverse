import json
import urllib.request
import urllib.parse
import time

TARGET_ARTISTS = [
    "Taylor Swift", "The Weeknd", "Eminem", "Tame Impala",
    "Chase Atlantic", "Travis Scott", "Bad Bunny", "Karan Aujla",
    "Arijit Singh", "Bruno Mars", "Ariana Grande", "Dua Lipa",
    "Playboi Carti", "Michael Jackson", "Arpit Bala", "Yo Yo Honey Singh"
]

print("=== STRICT AUTHENTIC ARTIST VERIFICATION ===")

strictly_verified = {}

def get_artist_genuine_tracks(artist):
    # Query iTunes specifically for the artist
    url = f"https://itunes.apple.com/search?term={urllib.parse.quote(artist)}&entity=song&limit=25"
    req = urllib.request.Request(url, headers={"User-Agent": "SongVerse/2.0"})
    time.sleep(1.0) # Rate limit prevention
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
    
    results = data.get("results", [])
    valid_tracks = []
    seen_titles = set()
    
    # Matching tokens for artist name check
    artist_lower = artist.lower()
    
    for r in results:
        track_artist = r.get("artistName", "").lower()
        # Verify genuine artist credit (primary or featured)
        # e.g. "playboi carti" must be in artistName
        # But exclude "tribute", "karaoke", "in the style of", "rockabye baby", "piano tribute"
        if ("tribute" in track_artist or "karaoke" in track_artist or 
            "rockabye" in track_artist or "fusepackage" in track_artist or
            "string quartet" in track_artist or "backing track" in track_artist):
            continue
        
        # Check that target artist name appears in the artistName
        if artist_lower not in track_artist:
            # Check for special name variations
            if artist == "Arijit Singh" and ("arijit" in track_artist): pass
            elif artist == "Yo Yo Honey Singh" and ("honey singh" in track_artist): pass
            elif artist == "Michael Jackson" and ("jackson" in track_artist): pass
            else:
                continue
        
        title = r.get("trackName", "").strip()
        title_lower = title.lower()
        
        # Clean title deduplication (ignore remixes of identical title if already have base)
        base_title = title_lower.split("(")[0].split("-")[0].strip()
        if base_title in seen_titles:
            continue
        
        preview_url = r.get("previewUrl")
        if not preview_url:
            continue
        
        seen_titles.add(base_title)
        valid_tracks.append({
            "trackId": r.get("trackId"),
            "title": title,
            "artist": r.get("artistName"),
            "album": r.get("collectionName", "Single"),
            "year": r.get("releaseDate", "2020")[:4],
            "genre": r.get("primaryGenreName", "Pop"),
            "previewUrl": preview_url,
            "artworkUrl": r.get("artworkUrl100", "").replace("100x100bb", "600x600bb")
        })
        
        if len(valid_tracks) >= 5:
            break
            
    return valid_tracks

for artist in TARGET_ARTISTS:
    for attempt in range(3):
        try:
            tracks = get_artist_genuine_tracks(artist)
            strictly_verified[artist] = tracks
            print(f"✓ {artist}: {len(tracks)} authentic tracks verified with audio preview")
            for idx, t in enumerate(tracks, 1):
                print(f"   {idx}. \"{t['title']}\" by {t['artist']} ({t['year']})")
            break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"  [429 Rate Limit] Backing off for {artist}...")
                time.sleep(4.0)
            else:
                print(f"  Error for {artist}: {e}")
                break
        except Exception as e:
            print(f"  Error for {artist}: {e}")
            break

total_songs = sum(len(v) for v in strictly_verified.values())
print(f"\n==============================================")
print(f"FINAL AUTHENTIC VERIFIED COUNT: {total_songs} SONGS")
print(f"==============================================")

with open("data/strictly_verified_16_artists.json", "w") as f:
    json.dump(strictly_verified, f, indent=2)
