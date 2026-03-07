/// <reference types="vite/client" />

declare global {
    interface ImportMetaEnv {
        VITE_API_URL?: string;
    }
    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

export { };
