# POLYCHAT — Chat adapter for (YouTube, Chzzk, Soop)

YouTube, Chzzk, SOOP 등 서로 다른 인터넷 방송 플랫폼의 채팅 스트림을 하나의 공통 인터페이스로 다루는 TypeScript 라이브러리입니다.
플랫폼별 인증·전송 방식(REST 폴링, WebSocket, SDK 콜백)을 어댑터 패턴으로 캡슐화하여, 앱에서는 동일한 타입과 이벤트로 메시지를 처리합니다.

## 목차

- [설치](#설치)
- [환경 설정](#환경-설정)
- [실행](#실행)
- [플랫폼별 설정](#플랫폼별-설정)
  - [CHZZK](#chzzk)
  - [SOOP](#soop)
  - [YouTube](#youtube)
- [메시지 형식](#메시지-형식)
- [API 사용법](#api-사용법)
  - [초기화 (init)](#초기화-init)
  - [인증 (authenticate)](#인증-authenticate)
  - [연결 (connect)](#연결-connect)
  - [연결 해제 (disconnect)](#연결-해제-disconnect)
- [이벤트](#이벤트)
- [데모 앱 실행](#데모-앱-실행)

## 설치

```bash
npm install polychat-bridge
```

또는 yarn 사용:

```bash
yarn add polychat-bridge
```

## 환경 설정

각 플랫폼에서 OAuth 클라이언트를 생성해야 합니다:

### CHZZK
1. [CHZZK 개발자 센터](https://developers.naver.com/apps/#/register)에서 애플리케이션 등록
2. OAuth 2.0 클라이언트 ID와 Secret 발급
3. Redirect URI 설정 (예: `http://localhost:3000/callback`)

### SOOP
1. [SOOP 개발자 센터](https://www.sooplive.co.kr/developer)에서 애플리케이션 등록
2. OAuth 클라이언트 ID와 Secret 발급
3. Redirect URI 설정 (예: `http://localhost:3000/callback`)

### YouTube
1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. YouTube Data API v3 활성화
3. OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
4. Redirect URI 설정 (예: `http://localhost:3000/callback`)
5. 승인된 JavaScript 원본에 `http://localhost:3000` 추가

## 실행

### 라이브러리 빌드

```bash
npm run build
```

### 데모 앱 실행

```bash
npm run demo
```

데모 앱은 `http://localhost:3000`에서 실행됩니다.

## 플랫폼별 설정

### CHZZK
CHZZK는 OAuth 2.0 인증을 사용하며, WebSocket을 통해 실시간 채팅 메시지를 수신합니다.
https://developers.chzzk.naver.com 에서 클라이언트 ID / 클라이언트 Secret / 로그인 리디렉션 URL을 발급받으세요.

**필수 정보:**
- `clientId`: CHZZK OAuth 클라이언트 ID
- `clientSecret`: CHZZK OAuth 클라이언트 Secret
- `redirectUri`: OAuth 콜백 URL (예: `http://localhost:3000/callback`)
- API Scope는 채팅 메시지 조회, 후원 조회, 구독 조회입니다.(developer에서 설정 가능)

### SOOP
SOOP는 OAuth 인증과 자체 Chat SDK를 사용합니다.
사용

**필수 정보:**
- `clientId`: SOOP OAuth 클라이언트 ID
- `clientSecret`: SOOP OAuth 클라이언트 Secret
- `redirectUri`: OAuth 콜백 URL (예: `http://localhost:3000/callback`)
- 발급을 위해선 SOOP의 제휴Partner로 등록되어야 합니다.

### YouTube
YouTube는 OAuth 2.0 Implicit Grant Flow를 사용하며, REST API 폴링 방식으로 채팅을 수신합니다.

**필수 정보:**
- `clientId`: Google OAuth 클라이언트 ID
- `redirectUri`: OAuth 콜백 URL (예: `http://localhost:3000/callback`)

### 환경 변수 설정

데모 앱의 경우 `apps/example-react/.env` 파일을 생성:

```env
# CHZZK
VITE_CHZZK_CLIENT_ID=your_chzzk_client_id
VITE_CHZZK_CLIENT_SECRET=your_chzzk_client_secret

# SOOP
VITE_SOOP_CLIENT_ID=your_soop_client_id
VITE_SOOP_CLIENT_SECRET=your_soop_client_secret

# YouTube
VITE_YOUTUBE_CLIENT_ID=your_youtube_client_id
```

## 메시지 형식

모든 플랫폼의 채팅 메시지는 공통 `ChatMessage` 인터페이스로 통합됩니다:

```typescript
interface ChatMessage {
  platform: string;      // 플랫폼 이름 ('chzzk', 'soop', 'youtube')
  chat_id: string;       // 메시지 고유 ID (v1.1.0에서 구현 예정)
  nickname: string;      // 사용자 닉네임
  content: string;       // 메시지 내용
  timestamp: Date;       // 메시지 전송 시간
}
```

**예시:**

```typescript
{
  platform: 'chzzk',
  chat_id: 'unknown',  // v1.1.0에서 고유 ID 지원 예정
  nickname: 'user123',
  content: '안녕하세요!',
  timestamp: new Date('2025-10-14T12:00:00Z')
}
```

**주의사항:**
- 현재 `chat_id`는 모든 플랫폼에서 'unknown'으로 반환됩니다
- v1.1.0에서 각 플랫폼별 고유 메시지 ID 추적 기능이 추가될 예정입니다

## API 사용법

### 초기화 (init)

각 어댑터의 `init()` 메서드는 OAuth 인증을 시작하고 필요한 리소스를 초기화합니다.

#### CHZZK

```typescript
import { ChzzkAdapter } from 'polychat-bridge';

const adapter = new ChzzkAdapter();

await adapter.init({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'YOUR_REDIRECT_URI'
});
```

#### SOOP

```typescript
import { SoopAdapter } from 'polychat-bridge';

const adapter = new SoopAdapter();

await adapter.init({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET'
});
```

#### YouTube

```typescript
import { YouTubeAdapter } from 'polychat-bridge';

const adapter = new YouTubeAdapter();

await adapter.init({
  clientId: 'YOUR_CLIENT_ID', 
  redirectUri: 'YOUR_REDIRECT_URI',
  pollingIntervalSeconds: 5  // 선택사항: 1~10초, 기본값 5초
});
```

**Polling 간격 설정:**
- `pollingIntervalSeconds`: YouTube API 폴링 주기 (1~10초)
- 기본값: 5초
- 너무 짧은 간격은 API 할당량을 빠르게 소진할 수 있습니다

### 인증 (authenticate)

`init()` 후 `authenticate()`를 호출하여 액세스 토큰을 발급받습니다.

#### CHZZK

```typescript
await adapter.authenticate({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'YOUR_REDIRECT_URI',
  state: ''  // 사용하지 않으면 adapter 내부 state가 자동으로 사용됨
});
```

#### SOOP

```typescript
await adapter.authenticate({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET'
});
```

#### YouTube

```typescript
await adapter.authenticate({});
// YouTube는 init()에서 이미 토큰을 획득했으므로 빈 객체 전달
```

### 연결 (connect)

인증 후 `connect()`를 호출하여 실제 채팅 스트림에 연결합니다.

```typescript
// 이벤트 리스너 등록
adapter.on('message', (message: ChatMessage) => {
  console.log('새 메시지:', message);
});

adapter.on('connected', () => {
  console.log('연결 성공!');
});

adapter.on('error', (error: Error) => {
  console.error('에러 발생:', error);
});

// 연결
await adapter.connect();
```

### 연결 해제 (disconnect)

채팅 연결을 종료합니다.

```typescript
await adapter.disconnect();
```

## 이벤트

**PolyChat을 사용한 통합 이벤트 처리**

PolyChat은 모든 플랫폼의 어댑터 이벤트를 하나의 인터페이스로 통합합니다. 각 이벤트는 어떤 플랫폼에서 발생했는지 `platform` 정보를 포함합니다.

### 기본 사용법

```typescript
import { PolyChat, ChzzkAdapter, SoopAdapter } from 'polychat-bridge';

// PolyChat 인스턴스 생성
const polyChat = new PolyChat();

// 어댑터 등록
const chzzkAdapter = new ChzzkAdapter();
const soopAdapter = new SoopAdapter();

polyChat.registerAdapter(chzzkAdapter);
polyChat.registerAdapter(soopAdapter);

// 통합 이벤트 리스너 등록
polyChat.on('message', ({ platform, message }) => {
  console.log(`[${platform}] ${message.nickname}: ${message.content}`);
});

polyChat.on('connected', ({ platform }) => {
  console.log(`[${platform}] 연결됨`);
});

polyChat.on('error', ({ platform, error }) => {
  console.error(`[${platform}] 에러:`, error.message);
});
```

### 사용 가능한 이벤트

#### initialized
어댑터 초기화가 완료되었을 때 발생합니다.

```typescript
polyChat.on('initialized', ({ platform }) => {
  console.log(`[${platform}] 초기화 완료`);
});
```

**이벤트 데이터:**
- `platform: string` - 플랫폼 이름 ('chzzk', 'soop', 'youtube')

**화면 표시**: "🚀 초기화가 완료되었습니다" (파란색 시스템 메시지)

#### message
채팅 메시지를 수신했을 때 발생합니다.

```typescript
polyChat.on('message', ({ platform, message }) => {
  console.log(`[${platform}] ${message.nickname}: ${message.content}`);
});
```

**이벤트 데이터:**
- `platform: string` - 플랫폼 이름
- `message: ChatMessage` - 채팅 메시지 객체
  - `platform: string` - 플랫폼 이름
  - `chat_id: string` - 메시지 ID (현재 'unknown')
  - `nickname: string` - 사용자 닉네임
  - `content: string` - 메시지 내용
  - `timestamp: Date` - 메시지 시간

**화면 표시**: 일반 채팅 메시지로 표시 (흰색 배경)

#### connected
채팅 서버에 연결되었을 때 발생합니다.

```typescript
polyChat.on('connected', ({ platform }) => {
  console.log(`[${platform}] 채팅 서버 연결 완료`);
});
```

**이벤트 데이터:**
- `platform: string` - 플랫폼 이름

**화면 표시**: "✅ 채팅 서버에 연결되었습니다" (파란색 시스템 메시지)

#### disconnected
채팅 서버와의 연결이 끊어졌을 때 발생합니다.

```typescript
polyChat.on('disconnected', ({ platform }) => {
  console.log(`[${platform}] 채팅 서버 연결 해제`);
});
```

**이벤트 데이터:**
- `platform: string` - 플랫폼 이름

**화면 표시**: "⚠️ 채팅 서버 연결이 해제되었습니다" (파란색 시스템 메시지)

#### auth
인증 상태가 변경되었을 때 발생합니다.

```typescript
polyChat.on('auth', ({ platform, isAuthenticated }) => {
  console.log(`[${platform}] 인증 상태:`, isAuthenticated ? '성공' : '실패');
});
```

**이벤트 데이터:**
- `platform: string` - 플랫폼 이름
- `isAuthenticated: boolean` - 인증 성공 여부

**화면 표시**:
- 성공: "🔑 인증에 성공했습니다" (파란색 시스템 메시지)
- 실패: "❌ 인증에 실패했습니다" (파란색 시스템 메시지)

#### error
에러가 발생했을 때 발생합니다.

```typescript
polyChat.on('error', ({ platform, error }) => {
  console.error(`[${platform}] 에러:`, error.message);
});
```

**이벤트 데이터:**
- `platform: string` - 플랫폼 이름
- `error: Error` - 에러 객체

**화면 표시**: "❌ 오류 발생: [에러 메시지]" (파란색 시스템 메시지)

### 이벤트 리스너 제거

```typescript
const handleMessage = ({ platform, message }) => {
  console.log(`[${platform}] 메시지:`, message.content);
};

// 리스너 등록
polyChat.on('message', handleMessage);

// 리스너 제거
polyChat.off('message', handleMessage);
```

### 완전한 예제

```typescript
import { PolyChat, ChzzkAdapter, SoopAdapter, YouTubeAdapter } from 'polychat-bridge';

const polyChat = new PolyChat();

// 어댑터 생성 및 등록
const chzzk = new ChzzkAdapter();
const soop = new SoopAdapter();
const youtube = new YouTubeAdapter();

polyChat.registerAdapter(chzzk);
polyChat.registerAdapter(soop);
polyChat.registerAdapter(youtube);

// 통합 이벤트 리스너
polyChat.on('initialized', ({ platform }) => {
  console.log(`✅ ${platform} 초기화 완료`);
});

polyChat.on('auth', ({ platform, isAuthenticated }) => {
  console.log(`🔑 ${platform} 인증: ${isAuthenticated ? '성공' : '실패'}`);
});

polyChat.on('connected', ({ platform }) => {
  console.log(`🔗 ${platform} 연결됨`);
});

polyChat.on('message', ({ platform, message }) => {
  console.log(`💬 [${platform}] ${message.nickname}: ${message.content}`);
});

polyChat.on('error', ({ platform, error }) => {
  console.error(`❌ ${platform} 에러:`, error.message);
});

polyChat.on('disconnected', ({ platform }) => {
  console.log(`⚠️ ${platform} 연결 해제`);
});

// 초기화
await chzzk.init({ clientId: '...', clientSecret: '...', redirectUri: '...' });
await soop.init({ clientId: '...', clientSecret: '...' });
await youtube.init({ clientId: '...', redirectUri: '...', pollingIntervalSeconds: 5 });

// 인증
await chzzk.authenticate({ clientId: '...', clientSecret: '...', redirectUri: '...', state: '' });
await soop.authenticate({ clientId: '...', clientSecret: '...' });
await youtube.authenticate({});

// 연결
await chzzk.connect();
await soop.connect();
await youtube.connect();

// 모든 어댑터 연결 해제
await polyChat.disconnectAll();
```

### 디버깅

브라우저 개발자 도구의 Console 탭에서 다음 로그를 확인할 수 있습니다:

**개발 모드 (NODE_ENV !== 'production'):**
- `[PLATFORM] OAuth code received` - OAuth 인증 완료
- `[PLATFORM] Authenticated successfully` - 토큰 발급 완료
- `[PLATFORM] Connected` - 채팅 서버 연결
- `[PLATFORM] Disconnected` - 연결 해제
- `[HTTP] → GET/POST ...` - HTTP 요청
- `[HTTP] ← 200 ...` - HTTP 응답

**배포 모드 (NODE_ENV === 'production'):**
- 경고 및 에러 로그만 출력
- `[PLATFORM] Token/session revoked` - 세션 만료
- `[HTTP] ⨯ 4xx/5xx ...` - HTTP 에러

**로그 레벨:**
- `debug`: 개발 전용 (상세 디버깅 정보)
- `info`: 개발 전용 (일반 정보)
- `warn`: 항상 출력 (경고 메시지)
- `error`: 항상 출력 (에러 메시지)

## 라이선스

MIT
