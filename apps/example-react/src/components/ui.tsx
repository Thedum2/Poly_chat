import type { Platform, AdapterState } from '../types';

export const PLATFORMS: Platform[] = ['chzzk', 'soop', 'youtube'];
export const PLATFORM_INFO = {
  chzzk: { name: 'CHZZK', description: '즐거움이 모이는 순간', method: '실시간 연결' },
  soop: { name: 'SOOP', description: '함께 만드는 라이브', method: '실시간 연결' },
  youtube: { name: 'YouTube', description: '전 세계와 나누는 이야기', method: '실시간 수신' },
};

const paths = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  chat: (
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5H7l-4 2V7a4 4 0 0 1 4-4h6a8 8 0 0 1 8 8.5Z" />
      <path d="M7 9h9M7 13h6" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  plug: (
    <>
      <path d="m8 3 1 5m7-5-1 5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4" />
    </>
  ),
  activity: <path d="M2 12h5l3-8 4 16 3-8h5" />,
  code: (
    <>
      <path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16" />
    </>
  ),
  book: (
    <>
      <path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15" />
    </>
  ),
  play: <path d="m8 4 13 8-13 8V4Z" />,
  stop: <rect x="5" y="5" width="14" height="14" rx="2" />,
  reset: (
    <>
      <path d="M3 10a9 9 0 1 1 1 7M3 3v7h7" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />,
};

export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function PlatformMark({ platform, small = false }: { platform: Platform; small?: boolean }) {
  return (
    <span className={`platform-mark ${platform} ${small ? 'small' : ''}`} aria-hidden="true">
      {platform === 'chzzk' ? (
        <svg width="27" height="30" viewBox="0 0 27 30" fill="currentColor">
          <path d="M15 2H5l6 8-9 10h9l-2 8 16-17H14l1-9Z" />
        </svg>
      ) : platform === 'youtube' ? (
        <svg width="29" height="22" viewBox="0 0 29 22">
          <rect y="1" width="29" height="20" rx="6" fill="currentColor" />
          <path d="m12 6 8 5-8 5V6Z" fill="white" />
        </svg>
      ) : (
        <span className="soop-symbol">
          S<span>•</span>
        </span>
      )}
    </span>
  );
}

export function StatusBadge({ status }: { status: AdapterState['status'] }) {
  const labels = {
    connected: '연결됨',
    authenticated: '인증 완료',
    initialized: '초기화 완료',
    disconnected: '연결 대기',
  };
  return (
    <span className={`status-badge ${status}`}>
      <span className="status-dot" />
      {labels[status]}
    </span>
  );
}
