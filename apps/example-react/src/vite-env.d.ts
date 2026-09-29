/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_YOUTUBE_CLIENT_ID?: string
  readonly VITE_YOUTUBE_STREAM_URL?: string
  readonly VITE_SOOP_CLIENT_ID?: string
  readonly VITE_SOOP_CLIENT_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
