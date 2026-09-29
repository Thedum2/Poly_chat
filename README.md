# POLYCHAT — Chat adapter for (YouTube, Chzzk, Soop)
![demo](https://github.com/user-attachments/assets/0ac6b384-47d3-4059-a618-0bba199ecee7)
YouTube, Chzzk, SOOP 등 서로 다른 인터넷 방송 플랫폼의 채팅 스트림을 하나의 공통 인터페이스로 다루는 TypeScript 라이브러리입니다.
플랫폼별 인증·전송 방식(gRPC/SSE 스트리밍, WebSocket, SDK 콜백)을 어댑터 패턴으로 캡슐화하여, 앱에서는 동일한 타입과 이벤트로 메시지를 처리합니다.


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
2. OAuth 2.0 클라이언트 ID와 Secret을 서버에 설정 (브라우저에는 공개 ID만 제공)
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

대시보드에서 플랫폼을 선택하고 연결 정보를 입력한 뒤 **채팅 콘솔 열기**를 누릅니다. 콘솔에서 플랫폼별 초기화 → 인증 → 연결을 진행할 수 있습니다. 콘솔의 테스트 기능은 선택한 플랫폼의 샘플 메시지를 보여줍니다. 테스트 중지와 연결 재설정으로 메시지 생성을 중단할 수 있습니다. 설정 화면과 채팅 콘솔은 모바일 화면에도 맞춰 표시됩니다.

YouTube 초기화 중에는 **로그인 대기 중…**이 표시됩니다. 로그인 완료 후 팝업이 닫히면 **인증 → 연결**을 진행합니다. 취소·권한 거부·팝업 차단은 플랫폼 카드에 오류로 표시됩니다. 팝업 결과를 읽으려면 콜백의 출처(프로토콜·도메인·포트)가 현재 샘플 페이지와 같아야 하며, 기본 주소는 현재 페이지의 `/callback`입니다. Google에 등록한 리디렉션 URI도 이 주소와 정확히 일치해야 합니다.

### 데모 개발/운영 배포

Node.js 24에서 아래 명령으로 양쪽 모드를 검증한다.

```sh
npm ci
npm test
npm run build
npm run build:dev --workspace=polychat-example-react
npm run build:prod --workspace=polychat-example-react
```

데모 빌드 결과는 `apps/example-react/dist/`다. 공개 환경 파일 `.env.development`와 `.env.production`의 API 기본값은 각각 `https://api-dev.galashow.cloud`, `https://api.galashow.cloud`다. 개인 설정은 무시되는 `apps/example-react/.env.development.local` 또는 `.env.production.local`의 `VITE_API_URL`로 덮어쓴다. 빈 값은 모드의 기본값을 사용한다.

로컬 `npm run demo`는 Vite의 `/api/chzzk` 프록시를 GalaShow API의 `/chzzk`로 연결한다. 정적 빌드는 선택한 API의 `/chzzk`로 요청한다. API는 해당 웹 origin에 대한 CORS를 허용해야 한다.

CHZZK와 YouTube의 기본 콜백은 현재 브라우저 origin의 `/callback`이다. 제공자 콘솔에 실제 사용하는 주소를 등록한다.

| 실행 환경 | Redirect URI | Google 승인된 JavaScript 원본 |
| --- | --- | --- |
| 개발 웹 | `https://dev.galashow.cloud/callback` | `https://dev.galashow.cloud` |
| 운영 웹 | `https://galashow.cloud/callback` | `https://galashow.cloud` |
| 로컬 데모 | `http://localhost:3000/callback` | `http://localhost:3000` |

다른 origin에 데모를 배포하면 해당 주소로 등록한다. 정적 호스팅은 `/callback`을 `index.html`로 제공해야 한다. 제공자 등록과 실제 로그인 성공은 별도로 검증한다.

## CI/CD와 npm 릴리스

`PolyChat CI and npm release`는 PR과 `develop`/`main`/`master` push에서 Node.js 24로 `npm ci`, 전체 테스트, YouTube 중계 서버 타입 검사, 라이브러리 빌드와 개발/운영 데모 빌드를 실행한다. 데모 결과와 검사한 npm tarball은 Actions 산출물로 7일 보관한다.

`npm run test:package`는 실제 tarball을 작업 공간 밖에 설치해 ESM·CommonJS 로드, 브라우저 번들, TypeScript 선언 및 `main`/`module`/`exports` 경로를 검증한다. 브라우저 런타임 의존성 `events`를 패키지에 포함하며, ESM 전용 UUID 의존성은 양쪽 배포 형식에 번들해 CommonJS 소비자도 사용할 수 있게 한다.

npm 게시는 Actions 수동 실행에서 `publish=true`를 선택할 때만 수행한다. 먼저 버전을 올리고 `package.json`과 `package-lock.json`을 함께 커밋한다. 이미 게시된 버전, registry 조회 오류, 누락된 `NPM_TOKEN`은 빌드 전에 실패하며 테스트/빌드가 실패해도 게시하지 않는다. 모든 검증 후 별도 job이 **검사한 tarball 자체**를 `--access public --provenance`로 게시한다. 현재 `1.0.2`는 이미 npm에 게시되어 있으므로 새 릴리스는 버전 증가가 필요하다.

저장소 Actions secret `NPM_TOKEN`은 `polychat-bridge` 게시 권한이 있고 비대화형 게시가 가능한 유효한 토큰이어야 한다. [npm provenance 설정](https://docs.npmjs.com/generating-provenance-statements/)에 필요한 `id-token: write`는 게시 job에만 부여한다. workflow를 실행할 브랜치/태그는 GitHub의 **Use workflow from**에서 선택한다. 기본 `publish=false`는 검증만 수행한다.

이 워크플로는 npm 라이브러리와 다운로드 가능한 데모 산출물을 만든다. 별도 데모 호스팅이나 장기 실행 YouTube 중계 서버를 AWS에 배포하지 않는다. 중계 서버 운영은 [YouTube 설정](#youtube)의 HTTPS·SSE·CORS 요구사항을 별도로 충족해야 한다.

## 플랫폼별 설정

### CHZZK
CHZZK는 OAuth 2.0 인증을 사용하며, WebSocket을 통해 실시간 채팅 메시지를 수신합니다.
https://developers.chzzk.naver.com 에서 클라이언트 ID / 클라이언트 Secret / 로그인 리디렉션 URL을 발급받고, ID와 Secret은 GalaShow API 서버에 설정하세요. 브라우저는 `/chzzk/config`에서 공개 ID를 받습니다.

**필수 정보:**
- `apiBaseUrl`: GalaShow API의 `/chzzk`까지 포함한 주소
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
YouTube는 OAuth 2.0 Implicit Grant Flow로 인증하고, 공식 [`liveChatMessages.streamList`](https://developers.google.com/youtube/v3/live/docs/liveChatMessages/streamList)의 지속 연결로 채팅을 수신합니다. Node 서버가 YouTube gRPC 스트림을 받아 브라우저에 SSE로 전달합니다. 정기적인 채팅 조회 요청은 보내지 않습니다.

수동 연결 시점 이후의 메시지만 표시합니다. 일시적 통신 장애는 1~30초 지수 백오프로 재접속하며 마지막 커서에서 이어받고 최근 메시지 ID로 중복을 제거합니다. 권한·인증·할당량 오류는 자동 재시도를 중단하고 오류로 알립니다. 연결 해제는 브라우저 요청과 서버의 gRPC 스트림을 함께 취소합니다.

로컬에서는 `npm run demo`가 `/api/youtube/chat/stream` 중계를 함께 실행합니다. 정적 배포에서는 아래 Node 중계 서버도 실행해야 합니다. 브라우저 라이브러리만 배포하면 중계 서버가 생성되지는 않습니다.

```powershell
# 저장소 루트에서 npm ci 후 실행 (tsx 개발 의존성 필요)
$env:YOUTUBE_STREAM_ALLOWED_ORIGINS = 'https://galashow.cloud,https://dev.galashow.cloud'
npm run youtube:server
```

서버 기본 주소는 `127.0.0.1:3001/youtube/chat/stream`입니다. `YOUTUBE_STREAM_HOST`, `YOUTUBE_STREAM_PORT`로 바꿀 수 있습니다. 허용할 웹 origin은 `YOUTUBE_STREAM_ALLOWED_ORIGINS`에 쉼표로 구분하고 마지막 `/` 없이 입력합니다. 서버에는 사용자 토큰을 저장하지 않으며 연결 요청의 Authorization 헤더만 Google에 전달합니다.

배포 API의 `/youtube/chat/stream`을 이 서버로 프록시하거나, 데모 빌드 시 `VITE_YOUTUBE_STREAM_URL`에 HTTPS 중계 주소를 지정합니다. 기본 배포 주소는 `${VITE_API_URL}/youtube/chat/stream`입니다. 프록시는 SSE 응답 버퍼링을 끄고 장기 연결을 허용해야 하며, 서버에서 `youtube.googleapis.com:443`으로 HTTP/2 통신이 가능해야 합니다. API 활성화와 OAuth 권한 설정은 여전히 필요합니다.

[Google의 스트리밍 가이드](https://developers.google.com/youtube/v3/live/streaming-live-chat)에 있는 protobuf 스키마를 `server/youtube-stream.proto`에 포함했습니다.

**필수 정보:**
- `clientId`: Google OAuth 클라이언트 ID
- `redirectUri`: OAuth 콜백 URL (예: `http://localhost:3000/callback`)

### 환경 변수 설정

데모 앱의 경우 무시되는 `apps/example-react/.env.local` 파일을 생성:

```env
# SOOP
VITE_SOOP_CLIENT_ID=your_soop_client_id
VITE_SOOP_CLIENT_SECRET=your_soop_client_secret

# YouTube
VITE_YOUTUBE_CLIENT_ID=your_youtube_client_id
```

`VITE_*` 값은 브라우저 번들에 공개된다. 기존 데모의 플랫폼 Secret 입력 방식은 그대로이며 비밀 값을 공개 환경 파일이나 저장소에 추가하지 않는다. 실제 서비스의 Secret 관리는 서버에서 처리해야 한다.

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
  redirectUri: 'YOUR_REDIRECT_URI',
  apiBaseUrl: 'https://api-dev.galashow.cloud/chzzk'
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
  streamUrl: '/api/youtube/chat/stream'  // 선택사항: 실시간 중계 주소
});
```

**Polling 간격 설정:**
- `streamUrl`: 실시간 SSE 중계 주소 (기본 `/api/youtube/chat/stream`)
- `pollingIntervalSeconds`: 이전 코드 호환을 위해 타입만 유지하며 더 이상 사용하지 않습니다.
- 기본값: 5초
- 너무 짧은 간격은 API 할당량을 빠르게 소진할 수 있습니다

### 인증 (authenticate)

`init()` 후 `authenticate()`를 호출하여 액세스 토큰을 발급받습니다.

#### CHZZK

```typescript
await adapter.authenticate({});
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
await chzzk.init({ redirectUri: '...', apiBaseUrl: 'https://api-dev.galashow.cloud/chzzk' });
await soop.init({ clientId: '...', clientSecret: '...' });
await youtube.init({ clientId: '...', redirectUri: '...', streamUrl: '/api/youtube/chat/stream' });

// 인증
await chzzk.authenticate({});
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
