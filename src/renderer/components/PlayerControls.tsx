import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';

export const PlayerControls = () => {
  const { isPlaying, togglePlay, skipNext, skipPrevious } = useSpotifyPlayer();

  return (
    <div className="player-controls-container">
      <div className="player-controls">
        <button onClick={skipPrevious} className="control-btn">
          <img src="/assets/icons/arrow-circle-left-solid.svg" alt="Previous" />
        </button>
        <button onClick={togglePlay} className="control-btn play-pause-btn">
          {isPlaying ? (
            <img src="/assets/icons/pause-solid.svg" alt="Pause" />
          ) : (
            <img src="/assets/icons/play-solid (1).svg" alt="Play" />
          )}
        </button>
        <button onClick={skipNext} className="control-btn">
          <img src="/assets/icons/arrow-circle-right-solid.svg" alt="Next" />
        </button>
      </div>
    </div>
  );
};