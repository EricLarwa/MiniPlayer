import { useEffect, useState } from 'react';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';

// Extend the Window interface to include the optional electron property
declare global {
  interface Window {
    electron?: any;
  }
}

const CLIENT_ID = '2fa7700ed8e74c21945bf239c53330e1';
const SCOPES = 'user-read-currently-playing user-read-playback-state';

// Detect if we're running in Electron
const IS_ELECTRON = !!window.electron || !!(window as any).require;

// Genre to image mapping
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string>('');
  const query = new URLSearchParams(window.location.search);
  const [code, setCode] = useState<string | null>(null);

  // Get the redirect URI 
  useEffect(() => {
  const getRedirectUri = async () => {
    if (IS_ELECTRON) {
      try {
        const uri = 'http://127.0.0.1:8888/callback';
        console.log('Setting redirect URI (Electron):', uri);
        setRedirectUri(uri);
      } catch (err) {
        console.error('Error getting redirect URI:', err);
        setRedirectUri('http://127.0.0.1:8888/callback');
      }
    } else {
      const uri = 'http://127.0.0.1:8888/callback';
      console.log('Setting redirect URI (Browser):', uri);
      setRedirectUri(uri);
    }
  };

  getRedirectUri();
}, []);

  useEffect(() => {
    if (code && redirectUri) {
      console.log('Both code and redirect URI are ready. Redirect URI:', redirectUri);
      exchangeCodeForToken(code);
    }
  }, [code, redirectUri]);


  useEffect(() => {
    if (code && redirectUri) {
      console.log('Both code and redirect URI available, starting token exchange...');
      exchangeCodeForToken(code);
    }
  }, [code, redirectUri]);


  // Set up listener for auth callback from main process
    useEffect(() => {
      if (IS_ELECTRON && (window as any).electron?.ipcRenderer) {
        console.log('Setting up auth-callback listener');
        const ipc = (window as any).electron.ipcRenderer;

        const handler = (_event: any, authCode: string) => {
          console.log('Received auth callback with code');
          setCode(authCode); // ✅ store the code
        };

        ipc.on('auth-callback', handler);

        return () => ipc.removeListener('auth-callback', handler);
      }
    }, []);


  // Handle browser URL params for non-Electron mode
  useEffect(() => {
    if (!IS_ELECTRON) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        console.log('Found code in URL parameters');
        exchangeCodeForToken(code);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
  const query = new URLSearchParams(window.location.search);
  const authCode = query.get('code');
  if (authCode) {
    console.log('Extracted code from URL:', authCode);
    setCode(authCode);
  }
  }, []);


  // Exchange authorization code for access token
  const exchangeCodeForToken = async (code: string) => {
    console.log('In exchangeCodeForToken, redirectUri:', redirectUri);
    if (!redirectUri) {
      setError('Redirect URI not set');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const storedVerifier = localStorage.getItem('verifier');
    if (!storedVerifier) {
      setError('PKCE verifier not found');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('Exchanging code for token using redirect URI:', redirectUri);
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: storedVerifier,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error_description || 'Failed to get access token');
      }
      
      console.log('Successfully obtained access token');
      setAccessToken(data.access_token);
      localStorage.removeItem('verifier');
    } catch (err) {
      console.error('Token exchange error:', err);
      setError(`Authentication error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch currently playing track and artist info
  useEffect(() => {
    const fetchCurrentlyPlaying = async () => {
      if (!accessToken) return;

      try {
        // Get currently playing track
        const trackRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        if (!trackRes.ok) {
          if (trackRes.status === 401) {
            setError('Token expired. Please login again.');
            setAccessToken(null);
            return;
          }
          
          if (trackRes.status !== 204) {
            throw new Error(`API error: ${trackRes.status}`);
          }
          
          // 204 means no track is playing
          setCurrentTrack(null);
          return;
        }

        // If no content (204), no track is playing
        if (trackRes.status === 204) {
          setCurrentTrack(null);
          return;
        }

        const trackData = await trackRes.json();
        setCurrentTrack(trackData);
        
        const artistId = trackData?.item?.artists?.[0]?.id;
        if (!artistId) return;

        // Get artist details including genres
        const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        if (!artistRes.ok) {
          throw new Error(`Artist API error: ${artistRes.status}`);
        }

        const artistData = await artistRes.json();
        const genres: string[] = artistData.genres || [];
        const bg = resolveGenreImage(genres);
        setBackgroundImage(bg);
      } catch (err) {
        console.error('Error fetching music data:', err);
      }
    };

    if (accessToken) {
      fetchCurrentlyPlaying();
      // Set up periodic refresh
      const interval = setInterval(fetchCurrentlyPlaying, 30000); // every 30 seconds
      return () => clearInterval(interval);
    }
  }, [accessToken]);

  // Handle login button click
  const handleLogin = async () => {
    if (!redirectUri) {
      setError('Redirect URI not set. Please try again in a moment.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      localStorage.setItem('verifier', verifier);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: SCOPES,
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: challenge,
      });

      const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
      
      if (IS_ELECTRON) {
        try {
          // Use IPC to tell main process to open the auth URL
          const electron = (window as any).require ? (window as any).require('electron') : window.electron;
          if (electron?.ipcRenderer) {
            electron.ipcRenderer.send('start-auth', authUrl);
          } else {
            // Fallback to opening in the same window
            window.location.href = authUrl;
          }
        } catch (err) {
          console.error('Error starting auth in Electron:', err);
          window.open(authUrl, '_blank');
        }
      } else {
        // In browser, open in the same window
        window.location.href = authUrl;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(`Login error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Render the track information if available
  const renderTrackInfo = () => {
    if (!currentTrack?.item) {
      return (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '1rem 2rem',
          borderRadius: '8px',
        }}>
          No track currently playing
        </div>
      );
    }
    
    const { item } = currentTrack;
    
    return (
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '1.5rem',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '400px',
      }}>
        {item.album?.images?.[0]?.url && (
          <img 
            src={item.album.images[0].url} 
            alt="Album Cover"
            style={{
              width: '200px',
              height: '200px',
              objectFit: 'cover',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          />
        )}
        
        <h2 style={{ margin: '0.5rem 0', fontSize: '1.5rem' }}>
          {item.name}
        </h2>
        
        <p style={{ margin: '0.25rem 0', fontSize: '1.1rem', opacity: 0.8 }}>
          {item.artists?.map((artist: any) => artist.name).join(', ')}
        </p>
        
        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', opacity: 0.6 }}>
          {item.album?.name}
        </p>
      </div>
    );
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-image 1s ease-in-out',
      }}
    >
      {error && (
        <div style={{ 
          backgroundColor: 'rgba(255, 0, 0, 0.7)', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1rem',
          maxWidth: '400px',
        }}>
          {error}
        </div>
      )}
      
      {!accessToken ? (
        <button
          onClick={handleLogin}
          disabled={isLoading || !redirectUri}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            borderRadius: '8px',
            backgroundColor: '#1DB954',
            color: '#fff',
            border: 'none',
            cursor: isLoading || !redirectUri ? 'default' : 'pointer',
            opacity: isLoading || !redirectUri ? 0.7 : 1,
          }}
        >
          {isLoading ? 'Connecting...' : 'Connect to Spotify'}
        </button>
      ) : (
        renderTrackInfo()
      )}
    </div>
  );
}