import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Volume2 } from "lucide-react";
import RetroVisualizer from "./RetroVisualizer";
import { ThemeProvider, useTheme } from "./ThemeProvider";

interface Track {
  title: string;
  artist: string;
  albumArt: string;
  genre: string;
  duration: number;
}

interface MiniPlayerProps {
  initialTrack?: Track;
  isConnected?: boolean;
}

const defaultTrack: Track = {
  title: "Synthwave Dreams",
  artist: "RetroWave Artist",
  albumArt:
    "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&q=80",
  genre: "electronic",
  duration: 237,
};

const PlayerContent = () => {
  const { themeStyles } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track>(defaultTrack);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);

  // Simulate track progress when playing
  useEffect(() => {
    let interval: number | null = null;

    if (isPlaying) {
      interval = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            // Simulate next track
            setIsPlaying(false);
            return 0;
          }
          return prev + 100 / (currentTrack.duration * 10);
        });
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTrack.duration]);

  // Generate audio data for visualizer
  const generateAudioData = () => {
    return Array(20)
      .fill(0)
      .map(() => Math.random() * 100);
  };

  // Map genre to visualizer type
  const getVisualizerType = () => {
    const genre = currentTrack.genre.toLowerCase();
    if (["electronic", "techno", "edm", "dance", "house"].includes(genre))
      return "electronic";
    if (["rock", "metal", "alternative", "indie"].includes(genre))
      return "rock";
    if (["pop", "r&b", "hip-hop", "rap"].includes(genre)) return "pop";
    return "default";
  };

  return (
    <div
      className="w-full h-full rounded-lg overflow-hidden bg-black p-2"
      style={{
        fontFamily: themeStyles.fontFamily,
        boxShadow: `0 0 15px ${themeStyles.shadowColor}`,
        border: `2px solid ${themeStyles.borderColor}`,
      }}
    >
      <div className="flex flex-col h-full">
        {/* Album art and track info */}
        <div className="flex items-center mb-2">
          <div
            className="w-12 h-12 mr-2 rounded-sm overflow-hidden"
            style={{ border: `1px solid ${themeStyles.borderColor}` }}
          >
            <img
              src={currentTrack.albumArt}
              alt="Album Art"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <motion.div
              initial={{ x: 0 }}
              animate={{ x: currentTrack.title.length > 15 ? -100 : 0 }}
              transition={{
                repeat: Infinity,
                repeatType: "reverse",
                duration: 3,
                ease: "linear",
              }}
            >
              <p
                className="text-xs font-bold truncate"
                style={{ color: themeStyles.primaryColor }}
              >
                {currentTrack.title}
              </p>
            </motion.div>
            <p
              className="text-xs truncate"
              style={{ color: themeStyles.textColor }}
            >
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Visualizer */}
        <RetroVisualizer
          genre={getVisualizerType() as any}
          isPlaying={isPlaying}
          audioData={generateAudioData()}
        />

        {/* Progress bar - pixelated style */}
        <div
          className="w-full h-2 my-2 overflow-hidden pixel-art"
          style={{ backgroundColor: "#000000" }}
        >
          <div
            className="h-full"
            style={{
              width: `${progress}%`,
              backgroundColor: themeStyles.primaryColor,
              boxShadow: `0 0 4px ${themeStyles.primaryColor}`,
              imageRendering: "pixelated",
            }}
          ></div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              className="p-1 rounded-full hover:opacity-80 transition-opacity"
              style={{ color: themeStyles.secondaryColor }}
              onClick={() => console.log("Previous track")}
            >
              <SkipBack size={16} />
            </button>

            <button
              className="p-1 rounded-full hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: themeStyles.primaryColor,
                color: "#000000",
              }}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              className="p-1 rounded-full hover:opacity-80 transition-opacity"
              style={{ color: themeStyles.secondaryColor }}
              onClick={() => console.log("Next track")}
            >
              <SkipForward size={16} />
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <Volume2 size={14} style={{ color: themeStyles.textColor }} />
            <div className="w-16 h-3 bg-black relative pixel-art">
              {/* Custom pixelated volume bar */}
              <div
                className="absolute top-0 left-0 h-full"
                style={{
                  width: `${volume}%`,
                  backgroundColor: themeStyles.secondaryColor,
                  imageRendering: "pixelated",
                }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-16 h-3 opacity-0 absolute top-0 left-0 z-10 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniPlayer = ({
  initialTrack = defaultTrack,
  isConnected = true,
}: MiniPlayerProps) => {
  const [currentGenre, setCurrentGenre] = useState(initialTrack.genre);

  useEffect(() => {
    if (initialTrack) {
      setCurrentGenre(initialTrack.genre);
    }
  }, [initialTrack]);

  return (
    <ThemeProvider initialGenre={currentGenre}>
      <div className="w-full h-full bg-black rounded-lg overflow-hidden">
        {!isConnected ? (
          <div className="w-full h-full flex items-center justify-center text-white font-mono text-xs">
            <p>CONNECTING TO MUSIC SERVICE...</p>
          </div>
        ) : (
          <PlayerContent />
        )}
      </div>
    </ThemeProvider>
  );
};

export default MiniPlayer;
