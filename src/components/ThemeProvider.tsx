import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type ThemeType = "vaporwave" | "wood" | "neon" | "default";

type GenreMapping = {
  [key: string]: ThemeType;
};

interface ThemeContextType {
  currentTheme: ThemeType;
  setThemeByGenre: (genre: string) => void;
  themeStyles: Record<string, string>;
}

const genreThemeMapping: GenreMapping = {
  electronic: "vaporwave", //d
  edm: "vaporwave", //d
  house: "wood", //d
  rock: "wood", //d
  metal: "wood", //d
  alternative: "wood", //d
  indie: "wood", //d
  pop: "neon", //d
  randb: "neon", //d
  hiphop: "neon", //d
  rap: "neon", //d
  // Default theme is applied for any other genre
};

const themeStyles = {
  vaporwave: {
    background: " #7873f5",
    fontFamily: '"Press Start 2P", cursive',
    primaryColor: "#ff00ff",
    secondaryColor: "#00ffff",
    textColor: "#ffffff",
    borderColor: "#00ffff",
    shadowColor: "rgba(255, 0, 255, 0.5)",
  },
  wood: {
    background: "#5D4037", // Solid color for better pixel art look
    fontFamily: '"Press Start 2P", cursive',
    primaryColor: "#8B4513",
    secondaryColor: "#D2B48C",
    textColor: "#3E2723",
    borderColor: "#5D4037",
    shadowColor: "rgba(62, 39, 35, 0.5)",
  },
  neon: {
    background: "#000000", // Solid color for better pixel art look
    fontFamily: '"Orbitron", sans-serif',
    primaryColor: "#ff00ff",
    secondaryColor: "#00ff00",
    textColor: "#ffffff",
    borderColor: "#00ffff",
    shadowColor: "rgba(0, 255, 255, 0.7)",
  },
  default: {
    background: "#1a1a1a", // Solid color for better pixel art look
    fontFamily: '"Courier New", monospace',
    primaryColor: "#33ff33",
    secondaryColor: "#3333ff",
    textColor: "#ffffff",
    borderColor: "#444444",
    shadowColor: "rgba(51, 255, 51, 0.5)",
  },
};

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: "default",
  setThemeByGenre: () => {},
  themeStyles: themeStyles.default,
});

interface ThemeProviderProps {
  children: ReactNode;
  initialGenre?: string;
}

export const ThemeProvider = ({
  children,
  initialGenre = "",
}: ThemeProviderProps) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>("default");

  const setThemeByGenre = (genre: string) => {
    const normalizedGenre = genre.toLowerCase();
    const themeToApply = genreThemeMapping[normalizedGenre] || "default";
    setCurrentTheme(themeToApply);
  };

  useEffect(() => {
    if (initialGenre) {
      setThemeByGenre(initialGenre);
    }
  }, [initialGenre]);

  const value = {
    currentTheme,
    setThemeByGenre,
    themeStyles: themeStyles[currentTheme],
  };

  const cssVariables = {
    "--theme-bg": themeStyles[currentTheme].background,
    "--theme-font": themeStyles[currentTheme].fontFamily,
    "--theme-primary": themeStyles[currentTheme].primaryColor,
    "--theme-secondary": themeStyles[currentTheme].secondaryColor,
    "--theme-text": themeStyles[currentTheme].textColor,
    "--theme-border": themeStyles[currentTheme].borderColor,
    "--theme-shadow": themeStyles[currentTheme].shadowColor,
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value={value}>
      <div className="theme-container" style={cssVariables}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeProvider;
