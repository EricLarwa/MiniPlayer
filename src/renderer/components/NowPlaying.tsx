import { useEffect, useState } from 'react';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';
import { WindowControls } from './WindowControls';
import { PlayerControls } from './PlayerControls';
import './layout.css'

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

const CLIENT_ID = '2fa7700ed8e74c21945bf239c53330e1';
const SCOPES = 'user-read-currently-playing user-read-playback-state';
const VERIFIER_KEY = 'spotify_verifier'; 

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

// Async function to resolve genre image
const resolveGenreImage = async (genres: string[]): Promise<string> => {
  // First try to find matching genre
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
          // Fallback to Vite asset path
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
    // Fallback to Vite asset path for default
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

  useEffect(() => {
    const uri = 'http://127.0.0.1:8888/callback';
    console.log('Setting redirect URI:', isElectron() ? '(Electron)' : '(Browser)', uri);
    setRedirectUri(uri);
    
    // End initial loading state after a short delay
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  // Exchange authorization code for access token
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
      localStorage.removeItem(VERIFIER_KEY); // Clean up
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

  // Fetch currently playing track and artist info
  const getCurrentTrack = async (token: string) => {
    if (!token) {
      console.error('No token provided to getCurrentTrack');
      return;
    }
    
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 204) {
        console.log('No track currently playing');
        setCurrentTrack(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Track data received');
      
      // Update background image if artist genres are available
      if (data.item?.artists?.length > 0) {
        try {
          const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${data.item.artists[0].id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

              if (response.status === 429) {
              // Handle rate limiting
              const retryAfter = response.headers.get('Retry-After');
              const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000; // Default 5 seconds
              console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
              
              await new Promise(resolve => setTimeout(resolve, waitTime));
              
              // Retry the request
              return getCurrentTrack(token);
            }

          
          if (artistResponse.ok) {
            const artistData = await artistResponse.json();
            if (artistData.genres && artistData.genres.length > 0) {
              const backgroundImg = await resolveGenreImage(artistData.genres);
              setBackgroundImage(backgroundImg);
              console.log('Background image set based on artist genre:', backgroundImg);
            }
            console.log("Genres:", artistData.genres)
          }
          console.log('Artist data fetched successfully');
        } catch (artistError) {
          console.error('Failed to fetch artist data:');
        }
      }
      
      setCurrentTrack(data);
    } catch (error) {
      console.error('Failed to fetch current track:', error);
      if (error instanceof Error && error.message.includes('401')) {
        // Token expired, try to refresh
        refreshToken();
      }
    }
  };

  // Refresh the Spotify access token using the stored refresh token
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
  
      // Fetch the current track with the new token
      getCurrentTrack(data.access_token);
    } catch (err) {
      console.error('Token refresh error:', err);
      setError(`Failed to refresh token: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  // Check URL parameters and existing tokens
  useEffect(() => {
    console.log('Component mount effect running, checking for auth code in URL...');
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    // Log all query parameters for debugging
    if (window.location.search) {
      console.log('URL search params:', window.location.search);
      params.forEach((value, key) => {
        console.log(`URL param ${key}: ${value}`);
      });
    }
    
    const handleAuthentication = async () => {
      if (code) {
        try {
          setIsLoading(true); // Show loading state while processing URL code
          console.log('Code found in URL, exchanging for token:', code.substring(0, 5) + '...');
          const token = await exchangeCodeForToken(code);
          await getCurrentTrack(token);
        } catch (error) {
          console.error('Authentication process failed:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Check if token already valid
        const existingToken = localStorage.getItem('spotify_access_token');
        const tokenExpiry = localStorage.getItem('spotify_token_expiry');
        
        console.log('Checking for existing token:', 
          existingToken ? 'Token exists' : 'No token', 
          tokenExpiry ? `Expires: ${new Date(Number(tokenExpiry)).toLocaleString()}` : 'No expiry'
        );
        
        if (existingToken && tokenExpiry && Number(tokenExpiry) > Date.now()) {
          setAccessToken(existingToken);
          setIsLoading(true); // Show loading state while fetching track
          getCurrentTrack(existingToken).finally(() => setIsLoading(false));
        } else if (existingToken) {
          // Refresh if expired
          refreshToken();
        } else {
          console.log('No token found, user needs to log in');
          setIsLoading(false);
        }
      }
    };
    
    handleAuthentication();

    // Polling for track updates
    const interval = setInterval(() => {
      const token = localStorage.getItem('spotify_access_token');
      if (token) {
        getCurrentTrack(token);
      }
    }, 10000);
    
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
  display: 'flex',           // Horizontal layout
  alignItems: 'center',      // Vertically center items
  gap: '20px',               // Space between album art and text
  padding: '1.5rem',
  borderRadius: '8px',
  maxWidth: '500px',  
  color: 'white',
}}>
  {/* Album Cover (Left) */}
  {item.album?.images?.[0]?.url && (
    <img 
      src={item.album.images[0].url} 
      alt="Album Cover"
      style={{
        width: '150px',      // Slightly smaller for side-by-side
        height: '150px',
        objectFit: 'cover',
        borderRadius: '4px'
      }}
    />
  )}
  
  {/* Track Info (Right - Stacked) */}
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

  // NowPlaying.tsx
return (
  <div className="player-container" style={{ backgroundImage: `url("${backgroundImage}")` }}>
    {/* Add Window Controls */}
    <WindowControls />

    {/* Your existing content */}
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
    ) : isLoading ? (
      <div className="loading-message">
        <div className="loading-spinner"></div>
        Loading track information...
      </div>
    ) : (
      <>
        {renderTrackInfo()}
        {/* Add Player Controls */}
        <PlayerControls />
      </>
    )}
  </div>
</div>
);
}