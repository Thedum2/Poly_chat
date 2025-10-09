/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHZZK_CLIENT_ID?: string
  readonly VITE_CHZZK_CLIENT_SECRET?: string
  readonly VITE_SOOP_CLIENT_ID?: string
  readonly VITE_SOOP_CLIENT_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
