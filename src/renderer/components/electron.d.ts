interface ElectronAPI {
  onAuthCallback: (callback: (data: { code: string }) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}