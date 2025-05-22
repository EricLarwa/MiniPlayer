// WindowControls.tsx
import './layout.css'
export const WindowControls = () => {
  return (
    <div className="window-controls">
      <button
        className="window-btn minimize"
        onClick={() => {
          if (window.electronAPI?.minimize) {
            window.electronAPI.minimize();
          }
        }}
      >
        <img src="/assets/icons/minimize.png" alt="Minimize" />
      </button>
      <button
        className="window-btn close"
        onClick={() => {
          if (window.electronAPI?.close) {
            window.electronAPI.close();
          }
        }}
      >
        <img src="/assets/icons/window-close.svg" alt="Close" />
      </button>
    </div>
  );
};