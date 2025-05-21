export {};

declare global {
    interface Window {
        ElectronAPI: {
            aopenAuthPopup: (url: string) => void;
        }
    }
}