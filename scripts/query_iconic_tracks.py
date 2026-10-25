import urllib.request
import urllib.parse
import json
import time
import os

iconic_queries = {
    "Taylor Swift": ["Shake It Off", "Blank Space", "Cruel Summer", "Anti-Hero", "Love Story"],
    "The Weeknd": ["Blinding Lights", "Starboy", "Can't Feel My Face", "Die For You", "Save Your Tears"],
    "Eminem": ["Lose Yourself", "Without Me", "The Real Slim Shady", "Till I Collapse", "Mockingbird"],
    "Tame Impala": ["The Less I Know The Better", "Let It Happen", "Borderline", "Feels Like We Only Go Backwards", "Eventually"],
    "Chase Atlantic": ["Friends", "Consume", "Swim", "Into It", "Church"],
    "Travis Scott": ["SICKO MODE", "goosebumps", "BUTTERFLY EFFECT", "HIGHEST IN THE ROOM", "FE!N"],
    "Bad Bunny": ["Titi Me Pregunto", "Ojitos Lindos", "Me Porto Bonito", "Dakiti", "Moscow Mule"],
    "Karan Aujla": ["Winning Speech", "Softly", "Tauba Tauba", "Antidote", "Admirin' You"],
    "Arijit Singh": ["Kesariya", "Tum Hi Ho", "Channa Mereya", "Raabta", "Shayad"],
    "Bruno Mars": ["Uptown Funk", "Just the Way You Are", "24K Magic", "Locked Out of Heaven", "When I Was Your Man"],
    "Ariana Grande": ["7 rings", "thank u, next", "Side To Side", "One Last Time", "Into You"],
    "Dua Lipa": ["Levitating", "Don't Start Now", "New Rules", "Dance The Night", "One Kiss"],
    "Playboi Carti": ["Magnolia", "Sky", "wokeuplikethis", "Shoota", "R.I.P."],
    "Michael Jackson": ["Billie Jean", "Beat It", "Thriller", "Smooth Criminal", "Man in the Mirror"],
    "Arpit Bala": ["Gulabo", "Maharani", "Bandana Gang", "bargad", "Rakhlo Tum Chupaake"],
    "Yo Yo Honey Singh": ["Blue Eyes", "Brown Rang", "Dope Shope", "Desi Kalakaar", "Love Dose"]
}

# Load previously verified results to avoid duplicate queries
verified = {}
CACHE_FILE = "data/curated_80_iconic_tracks.json"
if os.path.exists(CACHE_FILE):
    try:
        with open(CACHE_FILE, "r") as f:
            verified = json.load(f)
    except:
        verified = {}

for artist, titles in iconic_queries.items():
    if artist not in verified:
        verified[artist] = []
    
    existing_titles = [t["title"].lower() for t in verified[artist]]
    
    for title in titles:
        # Check if already present
        if any(title.lower() in et for et in existing_titles):
            continue
        
        q = f"{artist} {title}"
        url = f"https://itunes.apple.com/search?term={urllib.parse.quote(q)}&entity=song&limit=4"
        
        # Bounded retry with exponential backoff on 429
        success = False
        for attempt in range(3):
            try:
                time.sleep(1.2) # Polite 1.2s delay to avoid Apple 429 rate limit
                req = urllib.request.Request(url, headers={"User-Agent": "SongVerse/2.0"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode())
                    results = data.get("results", [])
                    match = None
                    for r in results:
                        if r.get("previewUrl"):
                            match = r
                            break
                    if match:
                        track_name = match.get("trackName")
                        artist_name = match.get("artistName")
                        verified[artist].append({
                            "title": track_name,
                            "artist": artist_name,
                            "album": match.get("collectionName", "Single"),
                            "year": match.get("releaseDate", "2020")[:4],
                            "trackId": match.get("trackId"),
                            "genre": match.get("primaryGenreName", "Pop"),
                            "previewUrl": match.get("previewUrl"),
                            "artworkUrl": match.get("artworkUrl100", "").replace("100x100bb", "600x600bb")
                        })
                        existing_titles.append(track_name.lower())
                        print(f"  ✓ {artist} - {track_name}")
                        success = True
                        break
                    else:
                        print(f"  ✗ {artist} - {title} (no audio preview)")
                        success = True
                        break
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    wait_time = 3.5 * (attempt + 1)
                    print(f"  [429 Rate Limit] Backing off {wait_time:.1f}s for {artist} - {title}...")
                    time.sleep(wait_time)
                else:
                    print(f"  [HTTP {e.code}] {artist} - {title}: {e}")
                    break
            except Exception as e:
                print(f"  [Error] {artist} - {title}: {e}")
                break

total = sum(len(v) for v in verified.values())
print(f"\nCompleted verification run: {total} tracks total cached in {CACHE_FILE}")
with open(CACHE_FILE, "w") as f:
    json.dump(verified, f, indent=2)
