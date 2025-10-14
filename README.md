# POLYCHAT — Unified chat adapter for YouTube, Chzzk, Soop

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

### 환경 변수 설정

데모 앱의 경우 `apps/example-react/.env` 파일을 생성:

```env
# CHZZK
VITE_CHZZK_CLIENT_ID=your_chzzk_client_id
VITE_CHZZK_CLIENT_SECRET=your_chzzk_client_secret

# SOOP
VITE_SOOP_CLIENT_ID=your_soop_client_id
VITE_SOOP_CLIENT_SECRET=your_soop_client_secret
VITE_SOOP_REDIRECT_URI=your_soop_redirect_uri

# YouTube
VITE_YOUTUBE_CLIENT_ID=your_youtube_client_id
VITE_YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
```

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

**필수 설정:**
- `clientId`: CHZZK OAuth 클라이언트 ID
- `clientSecret`: CHZZK OAuth 클라이언트 Secret
- `redirectUri`: OAuth 콜백 URL (예: `http://localhost:3000/callback`)

**인증 흐름:**
1. `init()` - OAuth 팝업을 열어 인증 코드 획득
2. `authenticate()` - 인증 코드로 액세스 토큰 발급
3. `connect()` - WebSocket 연결 및 채팅 스트림 구독

### SOOP

SOOP는 OAuth 인증과 자체 Chat SDK를 사용합니다.

**필수 설정:**
- `clientId`: SOOP OAuth 클라이언트 ID
- `clientSecret`: SOOP OAuth 클라이언트 Secret

**인증 흐름:**
1. `init()` - SOOP Chat SDK 로드 및 OAuth 팝업 열기
2. `authenticate()` - 인증 코드로 액세스 토큰 발급 및 SDK 인증
3. `connect()` - Chat SDK 연결 및 메시지 리스너 등록

### YouTube

YouTube는 OAuth 2.0 Implicit Grant Flow를 사용하며, REST API 폴링 방식으로 채팅을 수신합니다.

**필수 설정:**
- `clientId`: Google OAuth 클라이언트 ID
- `clientSecret`: Google OAuth 클라이언트 Secret
- `redirectUri`: OAuth 콜백 URL (예: `http://localhost:3000/callback`)

**인증 흐름:**
1. `init()` - OAuth 팝업을 열어 액세스 토큰 직접 획득
2. `authenticate()` - 토큰 유효성 확인
3. `connect()` - 활성 라이브 방송 찾기 및 폴링 시작

## 메시지 형식

모든 플랫폼의 채팅 메시지는 공통 `ChatMessage` 인터페이스로 통합됩니다:

```typescript
interface ChatMessage {
  platform: string;      // 플랫폼 이름 ('chzzk', 'soop', 'youtube')
  chat_id: string;       // 메시지 고유 ID
  nickname: string;      // 사용자 닉네임
  content: string;       // 메시지 내용
  timestamp: Date;       // 메시지 전송 시간
}
```

**예시:**

```typescript
{
  platform: 'chzzk',
  chat_id: '12345',
  nickname: 'user123',
  content: '안녕하세요!',
  timestamp: new Date('2025-10-14T12:00:00Z')
}
```

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
  redirectUri: 'http://localhost:3000/callback'
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
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'http://localhost:3000/callback',
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
  redirectUri: 'http://localhost:3000/callback',
  state: ''  // adapter 내부 state가 자동으로 사용됨
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

모든 어댑터는 다음 이벤트를 발생시킵니다. 데모 앱에서는 모든 이벤트가 통합 채팅 화면에 표시됩니다.

### message
채팅 메시지를 수신했을 때 발생합니다.

```typescript
adapter.on('message', (message: ChatMessage) => {
  console.log(`[${message.platform}] ${message.nickname}: ${message.content}`);
});
```

**화면 표시**: 일반 채팅 메시지로 표시 (흰색 배경)

### connected
채팅 서버에 연결되었을 때 발생합니다.

```typescript
adapter.on('connected', () => {
  console.log('채팅 서버 연결 완료');
});
```

**화면 표시**: "✅ 채팅 서버에 연결되었습니다" (파란색 시스템 메시지)

### disconnected
채팅 서버와의 연결이 끊어졌을 때 발생합니다.

```typescript
adapter.on('disconnected', () => {
  console.log('채팅 서버 연결 해제');
});
```

**화면 표시**: "⚠️ 채팅 서버 연결이 해제되었습니다" (파란색 시스템 메시지)

### auth
인증 상태가 변경되었을 때 발생합니다.

```typescript
adapter.on('auth', (isAuthenticated: boolean) => {
  console.log('인증 상태:', isAuthenticated ? '성공' : '실패');
});
```

**화면 표시**:
- 성공: "🔑 인증에 성공했습니다" (파란색 시스템 메시지)
- 실패: "❌ 인증에 실패했습니다" (파란색 시스템 메시지)

### error
에러가 발생했을 때 발생합니다.

```typescript
adapter.on('error', (error: Error) => {
  console.error('에러:', error.message);
});
```

**화면 표시**: "❌ 오류 발생: [에러 메시지]" (파란색 시스템 메시지)

## 데모 앱 실행

### 1. 환경 변수 설정

`apps/example-react/.env` 파일을 생성하고 각 플랫폼의 OAuth 정보를 입력합니다.

### 2. 데모 앱 시작

```bash
npm run demo
```

### 3. 사용 방법

1. **플랫폼 선택**: 사용할 플랫폼(CHZZK, SOOP, YouTube)을 체크박스로 선택
2. **설정 입력**: 각 플랫폼의 설정 정보 입력
   - Client ID, Client Secret, Redirect URI (CHZZK, YouTube)
   - **YouTube 전용**: Polling 간격 (1~10초) - API 요청 주기 설정
3. **초기화**: '초기화' 버튼을 클릭하여 OAuth 인증 시작
   - OAuth 팝업이 열리면 로그인 및 권한 승인
   - 인증 코드가 자동으로 획득됨
   - 초기화 완료 시 시스템 메시지 표시
4. **인증**: '인증' 버튼을 클릭하여 액세스 토큰 발급
   - 인증 성공 시 "🔑 인증에 성공했습니다" 메시지 표시
5. **연결**: '연결' 버튼을 클릭하여 채팅 스트림 구독 시작
   - 연결 성공 시 "✅ 채팅 서버에 연결되었습니다" 메시지 표시
6. **메시지 확인**: 우측 패널에서 실시간으로 채팅 메시지 및 시스템 이벤트 확인
   - 일반 채팅: 흰색 배경
   - 시스템 메시지: 파란색 배경 (연결, 인증, 에러 등)

### 디버깅

브라우저 개발자 도구의 Console 탭에서 다음 로그를 확인할 수 있습니다:

- `[PLATFORM] Message received:` - 수신된 메시지
- `[PLATFORM] Connected` - 연결 상태
- `[PLATFORM] Auth:` - 인증 상태
- `[PLATFORM] Error:` - 에러 메시지

## 라이선스

MIT
