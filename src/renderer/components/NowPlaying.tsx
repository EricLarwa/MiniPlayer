import { useEffect, useState } from 'react';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';
import { WindowControls } from './WindowControls';
import { PlayerControls } from './PlayerControls';
import './layout.css'
import { c } from 'vite/dist/node/moduleRunnerTransport.d-DJ_mE5sf';

declare global {
  interface ElectronAPI {
    openAuthPopup?: (url: string) => void;
    getImagePath?: (imageName: string) => Promise<string>; 
    minimize?: () => void;
    close?: () => void;
    // add other methods if needed
  }

  interface Window {
    electron?: {
      ipcRenderer?: any;
    };
    electronAPI?: ElectronAPI;
  }
}

interface SpotifyArtist {
  genres: string[];
  // Add other properties you use from the artist response
}


interface SpotifyTrack {
  item: {
    id: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
    // Add other track properties you need
  };
  // Add other currently playing response properties
}

const CLIENT_ID = '2fa7700ed8e74c21945bf239c53330e1';
const SCOPES = 'user-read-currently-playing user-read-playback-state';
const VERIFIER_KEY = 'spotify_verifier';
const artistCache: Record<string, { data: SpotifyArtist; expiry: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
let rateLimitExpiry = 0;
let lastArtistRequestTime = 0;
const MIN_ARTIST_INTERVAL = 5000;
const RATE_LIMIT_BUFFER = 1000; // 1 second buffer

let retry = 0;
const MAX_RETRIES = 3;



const getBackoffDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);
// Detect if we're running in electronAPI
const isElectron = () => {
  return typeof window !== 'undefined' && !!window.electronAPI;
};

const genreToImage: Record<string, string> = {
  alternative: 'alternative.jpg',
  country: 'country.jpg',
  electronic: 'electronic.avif',
  indie: 'indie.png',
  metal: 'metal.jpg',
  'r&b': 'r-and-b.jpg',
  pop: 'pop.jpg',
  rock: 'rock.png',
  jazz: 'jazz.jpg',
  hiphop: 'hip-hop.avif',
  edm: 'edm.avif',
  default: 'assets/imgs/default.png',
  default1: 'assets/imgs/default.png',
  rap: 'rap.png',
};

const resolveGenreImage = async (genres: string[]): Promise<string> => {
  // Try to find matching genre
  for (const genre of genres) {
    for (const key in genreToImage) {
      if (genre.toLowerCase().includes(key)) {
        try {
          if (window.electronAPI?.getImagePath) {
            const img = await window.electronAPI.getImagePath(genreToImage[key]);
            if (img) {
              console.log(`Found genre image for ${key}: ${img.substring(0, 30)}...`);
              return img;
            }
          }
          // Fallback
          const vitePath = `/assets/imgs/${genreToImage[key]}`;
          console.log(`Using Vite path for ${key}: ${vitePath}`);
          return vitePath;
        } catch (error) {
          console.error(`Error loading image for ${key}:`, error);
          continue; // Try next genre
        }
      }
    }
  }
  
  // If no genre matched, use default
  try {
    if (window.electronAPI?.getImagePath) {
      const defaultImg = await window.electronAPI.getImagePath(genreToImage.default1);
      if (defaultImg) {
        console.log(`Using default image: ${defaultImg.substring(0, 30)}...`);
        return defaultImg;
      }
    }
    const viteDefaultPath = `/assets/imgs/${genreToImage.default1}`;
    console.log(`Using Vite path for default: ${viteDefaultPath}`);
    return viteDefaultPath;
  } catch (error) {
    console.error('Error loading default image:', error);
    // Ultimate fallback
    return 'assets/imgs/default.jpg';
  }
};

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
  error?: string;
  error_description?: string;
}

export default function NowPlaying() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>(genreToImage.default);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading state
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string>('');
  const [isFetchingArtist, setIsFetchingArtist] = useState<boolean>(false);

  useEffect(() => {
    const uri = 'http://127.0.0.1:8888/callback';
    console.log('Setting redirect URI:', isElectron() ? '(Electron)' : '(Browser)', uri);
    setRedirectUri(uri);
    
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  // Exchange authorization code for token
  const exchangeCodeForToken = async (code: string): Promise<string> => {
    console.log('Exchanging code for token, code length:', code.length);
    setIsLoading(true);
    setError(null);
    
    const storedVerifier = localStorage.getItem(VERIFIER_KEY);
    console.log('PKCE verifier found:', storedVerifier ? 'Yes' : 'No');
    
    if (!storedVerifier) {
      const errorMsg = 'PKCE verifier not found';
      console.error(errorMsg);
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
    
    try {
      const tokenParams = {
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: storedVerifier,
      };
      
      console.log('Token request params:', { 
        ...tokenParams, 
        code: code.substring(0, 5) + '...', 
        code_verifier: storedVerifier.substring(0, 5) + '...' 
      });
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenParams),
      });
      
      console.log('Token response status:', response.status);
      const data = await response.json();
      console.log('Token response data structure:', Object.keys(data));
      
      if (!response.ok || data.error) {
        console.error('Token exchange failed:', data);
        throw new Error(data.error_description || `Failed with status ${response.status}`);
      }
      
      console.log('Successfully obtained access token, expires in:', data.expires_in);
      
      // Store token info
      localStorage.setItem('spotify_access_token', data.access_token);
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
      localStorage.setItem('spotify_token_expiry', (Date.now() + data.expires_in * 1000).toString());
      
      setAccessToken(data.access_token);
      localStorage.removeItem(VERIFIER_KEY); 
      return data.access_token;
    } catch (err) {
      console.error('Token exchange error:', err);
      const errorMsg = `Authentication error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  
  const cleanCache = () => {
    const now = Date.now();
    Object.keys(artistCache).forEach(id => {
      if (artistCache[id].expiry < now) {
        delete artistCache[id];
      }
    });
  };

  const [lastTrackId, setLastTrackId] = useState<string | null>(null);

  // Main track fetching function
  const getCurrentTrack = async (token: string) => {
    if (!token) {
      console.error('No token provided');
      return;
    }
  
    try {
      // Only show loading if we don't have any track data 
      if (!currentTrack) {
        setIsLoading(true);
      }
  
      cleanCache(); 
  
      const trackResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      if (trackResponse.status === 204) {
        // No track playing
        if (currentTrack) {
          setIsLoading(true);
        }
        setCurrentTrack(null);
        return;
      }
  
      if (!trackResponse.ok) {
        throw new Error(`Track request failed: ${trackResponse.status}`);
      }
  
      const trackData: SpotifyTrack = await trackResponse.json();
      
      // Check if track actually changed before showing loading
      const trackChanged = currentTrack?.item?.id !== trackData.item?.id;
      const hadPreviousTrack = currentTrack !== null;
      
      if (trackChanged && hadPreviousTrack) {
        setIsLoading(true);
        console.log('Track changed - showing loading state');
      }
      
      setCurrentTrack(trackData);
  
      // Handle artist data if available
      if (trackData.item?.artists?.length > 0) {
        const currentTrackId = trackData.item.id;
        
        if (currentTrackId !== lastTrackId) {
          console.log('Track changed, fetching artist data');
          setLastTrackId(currentTrackId);
          
          const artistId = trackData.item.artists[0].id;
          const now = Date.now();
  
          // Check cache first
          if (artistCache[artistId] && artistCache[artistId].expiry > now) {
            console.log('Using cached artist data');
            const { genres } = artistCache[artistId].data;
            if (genres?.length > 0) {
              const bgImage = await resolveGenreImage(genres);
              setBackgroundImage(bgImage);
            }
            return;
          }
  
          // Rate limit
          if (now < rateLimitExpiry) {
            console.log(`Rate limited until ${new Date(rateLimitExpiry).toLocaleTimeString()}`);
            return;
          }
  
          // Minimum interval check
          if (now - lastArtistRequestTime < MIN_ARTIST_INTERVAL) {
            console.log(`Waiting ${MIN_ARTIST_INTERVAL/1000}s between artist requests`);
            return;
          }

          setIsFetchingArtist(true);
          lastArtistRequestTime = now;
  
          try {
            console.log(`Fetching artist data for: ${artistId}`);
            const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
  
            if (artistResponse.status === 429) {
              const retryAfter = parseInt(artistResponse.headers.get('Retry-After') || '10');
              rateLimitExpiry = now + (retryAfter * 1000);
              console.warn(`Rate limited. Waiting ${retryAfter} seconds`);
              return;
            }
  
            if (!artistResponse.ok) {
              throw new Error(`Artist request failed: ${artistResponse.status}`);
            }
  
            const artistData: SpotifyArtist = await artistResponse.json();
            
            // Cache the artist data
            artistCache[artistId] = {
              data: artistData,
              expiry: now + CACHE_TTL
            };
  
            if (artistData.genres?.length > 0) {
              const bgImage = await resolveGenreImage(artistData.genres);
              setBackgroundImage(bgImage);
            }
          } catch (err) {
            console.error('Artist fetch error:', err);
          } finally {
            setIsFetchingArtist(false);
          }
        } else {
          console.log('Same track playing, skipping artist fetch');
        }
      }
    } catch (error) {
      console.error('Track fetch error:', error);
      if (error instanceof Error && error.message.includes('401')) {
        refreshToken();
      }
    } finally {
      setIsLoading(false);
    }
  }; 
  
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem('spotify_access_token');
      if (token) getCurrentTrack(token);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshToken = async () => {
    const refresh_token = localStorage.getItem('spotify_refresh_token');
    if (!refresh_token) {
      setError('No refresh token available. Please login again.');
      setAccessToken(null);
      return;
    }
  
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: CLIENT_ID,
      });
  
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
  
      const data = await response.json();
  
      if (!response.ok || data.error) {
        throw new Error(data.error_description || `Failed with status ${response.status}`);
      }
  
      console.log('Successfully refreshed token');
      
      localStorage.setItem('spotify_access_token', data.access_token);
      localStorage.setItem('spotify_token_expiry', (Date.now() + data.expires_in * 1000).toString());
      setAccessToken(data.access_token);

      // Update the refresh token if Spotify returns a new one
      if (data.refresh_token) {
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
      }
  
      getCurrentTrack(data.access_token);
    } catch (err) {
      console.error('Token refresh error:', err);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (!isElectron()) {
      setError('Electron environment not detected. Cannot proceed with login.');
      return;
    }

    if (!redirectUri) {
      setError('Redirect URI not set. Please try again in a moment.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Clear any previous verifier
      localStorage.removeItem(VERIFIER_KEY);
      
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      localStorage.setItem(VERIFIER_KEY, verifier);
      console.log('Generated new PKCE verifier, length:', verifier.length);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: SCOPES,
        redirect_uri: redirectUri,
        code_challenge_method: 'S256',
        code_challenge: challenge,
      });

      const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
      console.log('Authorization URL created');

      if (window.electronAPI?.openAuthPopup) {
        console.log('Opening auth popup via electronAPI...');
        
        setTimeout(() => {
          const checkVerifier = localStorage.getItem(VERIFIER_KEY);
          console.log('Verifier check after 5s:', checkVerifier ? 'still exists' : 'missing!');
        }, 5000);
        
        await window.electronAPI.openAuthPopup(authUrl);
        console.log('Auth window opened, waiting for response...');
      } else {
        console.error('Electron API not available. Cannot open auth popup.');
        setError('App not running in Electron or preload script failed.');
        setIsLoading(false); 
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(`Login error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Listen for messages
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('Message received:', event.data);
      
      // Validate message structure
      if (event.data && event.data.type === 'spotify-auth' && event.data.code) {
        console.log('Received auth code from message event:', event.data.code.substring(0, 5) + '...');
        try {
          const token = await exchangeCodeForToken(event.data.code);
          await getCurrentTrack(token);
        } catch (err) {
          console.error('Error in auth flow:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    console.log('Setting up message event listener');
    window.addEventListener('message', handleMessage);
    return () => {
      console.log('Removing message event listener');
      window.removeEventListener('message', handleMessage);
    };
  }, [redirectUri]);

  // Check URL parameters and tokens
  useEffect(() => {
    console.log('Component mount effect running, checking for auth code in URL...');
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (window.location.search) {
      console.log('URL search params:', window.location.search);
      params.forEach((value, key) => {
        console.log(`URL param ${key}: ${value}`);
      });
    }
    
    const handleAuthentication = async () => {
      if (code) {
        try {
          setIsLoading(true);
          console.log('Code found in URL, exchanging for token:', code.substring(0, 5) + '...');
          const token = await exchangeCodeForToken(code);
          await getCurrentTrack(token);
        } catch (error) {
          console.error('Authentication process failed:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        const existingToken = localStorage.getItem('spotify_access_token');
        const tokenExpiry = localStorage.getItem('spotify_token_expiry');
        
        console.log('Checking for existing token:', 
          existingToken ? 'Token exists' : 'No token', 
          tokenExpiry ? `Expires: ${new Date(Number(tokenExpiry)).toLocaleString()}` : 'No expiry'
        );
        
        if (existingToken && tokenExpiry && Number(tokenExpiry) > Date.now()) {
          setAccessToken(existingToken);
          setIsLoading(true); 
          getCurrentTrack(existingToken).finally(() => setIsLoading(false));
        } else if (existingToken) {
          refreshToken();
        } else {
          console.log('No token found, user needs to log in');
          setIsLoading(false);
        }
      }
    };
    
    handleAuthentication();

    const interval = setInterval(() => {
      const token = localStorage.getItem('spotify_access_token');
      if (token) {
        getCurrentTrack(token);
      }
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  // Render track info or fallback
const renderTrackInfo = () => {
  if (!currentTrack) {
    console.log('currentTrack is null or undefined');
    return (
      <div className="no-track" style={{
        padding: '1rem 2rem',
        borderRadius: '8px',
      }}>
        No track currently playing
      </div>
    );
  }

  if (!currentTrack.item) {
    console.log('currentTrack.item is null or undefined');
    return (
      <div className="no-track"style={{
        padding: '1rem 2rem',
        borderRadius: '8px',
      }}>
        No track details available
      </div>
    );
  }

  const { item } = currentTrack;

  return (
    <div style={{
  display: 'flex',   
  alignItems: 'center',    
  gap: '20px',               
  padding: '1.5rem',
  borderRadius: '8px',
  maxWidth: '500px',  
  color: 'white',
}}>
  {item.album?.images?.[0]?.url && (
    <img 
      src={item.album.images[0].url} 
      alt="Album Cover"
      style={{
        width: '150px',     
        height: '150px',
        objectFit: 'cover',
        borderRadius: '4px'
      }}
    />
  )}
  
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    flex: 1,                 
    gap: '0.5rem'            
  }}>
    <h2 className="track-title" style={{
      margin: 0,
      fontSize: '1.5rem',
      fontWeight: 'bold'
    }}>
      {item.name}
    </h2>

    <h3 className="track-artists" style={{
      margin: 0,
      fontSize: '1.2rem',
      opacity: 0.9
    }}>
      {item.artists?.map((artist: any) => artist.name).join(', ')}
    </h3>

    <p className="track-album" style={{
      margin: 0,
      fontSize: '0.9rem',
      opacity: 0.8
    }}>
      {item.album?.name}
    </p>
  </div>
</div>
  );
};

return (
  <div className="player-container" style={{ backgroundImage: `url("${backgroundImage}")` }}>
    <WindowControls />

    <div className="content-wrapper">
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {!accessToken ? (
        <button
          onClick={handleLogin}
          disabled={isLoading || !redirectUri}
          className={`login-button ${(isLoading || !redirectUri) ? 'disabled' : ''}`}
        >
          {isLoading ? (
            <span>Connecting<span className="loading-dots"></span></span>
          ) : (
            'Connect to Spotify'
          )}
        </button>
          ) : (
            <>
              {renderTrackInfo()}
              <PlayerControls />
            </>
          )}
      </div>
    </div>
  );
}