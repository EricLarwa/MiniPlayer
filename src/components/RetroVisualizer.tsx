import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface RetroVisualizerProps {
  genre?: "electronic" | "rock" | "pop" | "default";
  isPlaying?: boolean;
  audioData?: number[];
}

const RetroVisualizer = ({
  genre = "default",
  isPlaying = false,
  audioData = Array(20)
    .fill(0)
    .map(() => Math.random() * 100),
}: RetroVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animationFrame, setAnimationFrame] = useState<number | null>(null);

  // Generate visualization based on genre
  useEffect(() => {
    if (!canvasRef.current || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear any existing animation
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
    }

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const renderFrame = () => {
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Generate new random data if playing
      const data = isPlaying
        ? audioData.map((val) => val + (Math.random() * 20 - 10))
        : audioData;

      switch (genre) {
        case "electronic":
          drawWaveform(ctx, data, canvas.width, canvas.height);
          break;
        case "rock":
          drawEqualizer(ctx, data, canvas.width, canvas.height);
          break;
        case "pop":
          drawCircleVisualizer(ctx, data, canvas.width, canvas.height);
          break;
        default:
          drawDefaultVisualizer(ctx, data, canvas.width, canvas.height);
          break;
      }

      const frame = requestAnimationFrame(renderFrame);
      setAnimationFrame(frame);
    };

    renderFrame();

    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [genre, isPlaying, audioData]);

  // Different visualization styles
  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    data: number[],
    width: number,
    height: number,
  ) => {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00FFFF"; // Cyan color for electronic

    const sliceWidth = width / data.length;
    let x = 0;

    ctx.moveTo(x, height / 2);

    for (let i = 0; i < data.length; i++) {
      const y = ((data[i] / 100) * height) / 2 + height / 4;
      ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  const drawEqualizer = (
    ctx: CanvasRenderingContext2D,
    data: number[],
    width: number,
    height: number,
  ) => {
    const barWidth = width / data.length;
    const barMargin = 2;
    const adjustedBarWidth = barWidth - barMargin;

    ctx.fillStyle = "#FF6B35"; // Orange-red for rock

    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / 100) * height;
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillRect(x, y, adjustedBarWidth, barHeight);
    }
  };

  const drawCircleVisualizer = (
    ctx: CanvasRenderingContext2D,
    data: number[],
    width: number,
    height: number,
  ) => {
    // Clear with dark purple background
    ctx.fillStyle = "#330033";
    ctx.fillRect(0, 0, width, height);

    const pixelSize = 3;
    const centerX = Math.floor(width / 2 / pixelSize) * pixelSize;
    const centerY = Math.floor(height / 2 / pixelSize) * pixelSize;
    const radius =
      Math.floor(Math.min(width, height) / 4 / pixelSize) * pixelSize;

    // Draw pixelated circular visualizer
    for (let i = 0; i < data.length; i++) {
      const amplitude =
        Math.floor(((data[i] / 100) * radius) / pixelSize) * pixelSize +
        radius / 2;
      const angle = (i / data.length) * Math.PI * 2;

      const x =
        Math.floor((centerX + Math.cos(angle) * amplitude) / pixelSize) *
        pixelSize;
      const y =
        Math.floor((centerY + Math.sin(angle) * amplitude) / pixelSize) *
        pixelSize;

      // Draw pixelated points
      ctx.fillStyle = "#FF00FF"; // Magenta for pop
      ctx.fillRect(x, y, pixelSize, pixelSize);

      // Add some variation with secondary pixels
      if (i % 2 === 0) {
        ctx.fillStyle = "#FF66FF";
        ctx.fillRect(x + pixelSize, y, pixelSize, pixelSize);
        ctx.fillRect(x, y + pixelSize, pixelSize, pixelSize);
      }
    }
  };

  const drawDefaultVisualizer = (
    ctx: CanvasRenderingContext2D,
    data: number[],
    width: number,
    height: number,
  ) => {
    const pixelSize = 4;
    const cols = Math.floor(width / pixelSize);
    const rows = Math.floor(height / pixelSize);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const dataIndex = i % data.length;
        const intensity = data[dataIndex] / 100;

        if (Math.random() < intensity * 0.3) {
          ctx.fillStyle = "#00FF00"; // Green for default retro
          ctx.fillRect(i * pixelSize, j * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  };

  return (
    <div className="w-full h-[60px] bg-black rounded-md p-1 overflow-hidden">
      <motion.div
        className="w-full h-full relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{
            backgroundColor:
              genre === "electronic"
                ? "#000033"
                : genre === "rock"
                  ? "#331100"
                  : genre === "pop"
                    ? "#330033"
                    : "#001100",
          }}
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 font-mono">
            PAUSED
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default RetroVisualizer;
