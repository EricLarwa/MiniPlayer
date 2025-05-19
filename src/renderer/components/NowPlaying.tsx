import { useEffect, useState } from 'react';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce'; 

const CLIENT_ID = '2fa7700ed8e74c21945bf239c53330e1';
const REDIRECT_URI = 'http://127.0.0.1:5173/callback'; // Update for Vercel or Electron build
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
      if (genre.toLowerCase().includes(key)) return genreToImage[key];
    }
  }
  return genreToImage.default;
};

export default function SpotifyNowPlaying() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>(genreToImage.default);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    const storedVerifier = localStorage.getItem('verifier');

    if (code && storedVerifier) {
      fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          code_verifier: storedVerifier,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setAccessToken(data.access_token);
          localStorage.removeItem('verifier');
          window.history.replaceState(null, '', '/');
        });
    }
  }, []);

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
      const genres: string[] = artistData.genres;
      const bg = resolveGenreImage(genres);
      setBackgroundImage(bg);
    };

    fetchCurrentlyPlaying();
  }, [accessToken]);

  const handleLogin = async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    localStorage.setItem('verifier', verifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: SCOPES,
      redirect_uri: REDIRECT_URI,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!accessToken ? (
        <button
          onClick={handleLogin}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            borderRadius: '8px',
            backgroundColor: '#1DB954',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Connect to Spotify
        </button>
      ) : (
        <div>🎧 Connected! Fetching genre background...</div>
      )}
    </div>
  );
}
