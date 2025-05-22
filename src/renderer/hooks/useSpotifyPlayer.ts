import { useState, useEffect } from 'react';

export const useSpotifyPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: isPlaying ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`
        }
      });
      if (response.ok) {
        setIsPlaying(!isPlaying);
      }
    } catch (error) {
      console.error('Error toggling play:', error);
    }
  };

  const skipNext = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`
        }
      });
      if (response.ok) {
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error skipping to next track:', error);
    }
  };

  const skipPrevious = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`
        }
      });
      if (response.ok) {
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error skipping to previous track:', error);
    }
  };

  const togglePause = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('spotify_access_token')}`
        }
      });
      if (response.ok) {
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  return { isPlaying, togglePlay, skipNext, skipPrevious, togglePause };
};