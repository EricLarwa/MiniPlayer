import React, { useEffect, useState } from 'react';

const CLIENT_ID = 'your_spotify_client_id';
const REDIRECT_URI = 'http://localhost:3000';
const SCOPES = 'user-read-currently-playing user-read-playback-state';

const genreToImage: Record<string, string> = {
  alternative: '/assets/imgs/alternative.jpg',
  country: '/assets/imgs/country.jpg',
  electronic: '/assets/imgs/electronic.avif',
  indie: '/assets/imgs/indie.png',
  metal: '/assets/imgs/metal.jpg',
  randb: '/assets/imgs/r-and-b.jpg',
  pop: '/assets/imgs/pop.jpg',
  rock: '/assets/imgs/rock.jpg',
  jazz: '/assets/imgs/jazz.jpg',
  hiphop: '/assets/imgs/hip-hop.avif',
  edm: '/assets/imgs/edm.avif',
  default: '/assets/imgs/default.jpg',
  rap: '/assets/imgs/rapc.jpg',
};

const resolveGenreImage = (genres: string[]): string => {
  for (const genre of genres) {
    for (const key in genreToImage) {
      if (genre.includes(key)) return genreToImage[key];
    }
  }
  return genreToImage.default;
};

export default function SpotifyNowPlaying() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>(genreToImage.default);

  // Handle auth redirect
  useEffect(() => {
    const hash = window.location.hash;
    if (!accessToken && hash) {
      const token = new URLSearchParams(hash.substring(1)).get('access_token');
      if (token) {
        setAccessToken(token);
        window.history.replaceState(null, '', window.location.pathname); // clean up URL
      }
    }
  }, [accessToken]);

  // Fetch currently playing track
  useEffect(() => {
    const fetchCurrentlyPlaying = async () => {
      if (!accessToken) return;
      const trackRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!trackRes.ok) return;

      const trackData = await trackRes.json();
      const artistId = trackData?.item?.artists?.[0]?.id;
      if (!artistId) return;

      const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!artistRes.ok) return;

      const artistData = await artistRes.json();
      const genres = artistData.genres;
      const bg = resolveGenreImage(genres);
      setBackgroundImage(bg);
    };

    fetchCurrentlyPlaying();
  }, [accessToken]);

  const handleLogin = () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = authUrl;
  };

  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
      }}
    >
      {!accessToken && (
        <button onClick={handleLogin} style={{ padding: '1rem', fontSize: '1.2rem' }}>
          Connect to Spotify
        </button>
      )}
    </div>
  );
}
