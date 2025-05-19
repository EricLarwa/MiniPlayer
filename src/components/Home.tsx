import React, { useState } from "react";
import MiniPlayer from "./MiniPlayer";

function Home() {
  const [currentTrack] = useState({
    title: "Synthwave Dreams",
    artist: "RetroWave Artist",
    albumArt:
      "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300&q=80",
    genre: "electronic",
    duration: 237,
  });

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="w-full h-[180px]">
          <MiniPlayer initialTrack={currentTrack} isConnected={true} />
        </div>
      </div>
    </div>
  );
}

export default Home;
