# PolyChat React Example

React로 작성된 PolyChat 데모 애플리케이션입니다. CHZZK와 SOOP 플랫폼의 채팅을 브라우저에서 실시간으로 테스트할 수 있습니다.

## 설치

```bash
cd apps/example-react
npm install
```

## 실행

```bash
npm run dev
```

브라우저가 자동으로 `http://localhost:3000`으로 열립니다.

## 환경 변수 설정 (선택사항)

API 키를 미리 설정하면 자동으로 입력됩니다:

```bash
cp .env.example .env
```

`.env` 파일을 열어 필요한 값을 입력하세요:

```env
VITE_CHZZK_CLIENT_ID=your_client_id
VITE_CHZZK_CLIENT_SECRET=your_client_secret
VITE_SOOP_CLIENT_ID=your_client_id
VITE_SOOP_CLIENT_SECRET=your_client_secret
```

환경 변수가 없어도 UI에서 직접 입력할 수 있습니다.

## 사용 방법

### 1. 플랫폼 선택

애플리케이션 실행 시 CHZZK 또는 SOOP 중 하나를 선택합니다.

### 2. CHZZK 사용하기

1. **초기화**: Client ID, Client Secret 입력 (환경 변수 설정 시 자동 입력됨)
2. **인증**: "🔐 팝업으로 인증하기" 버튼 클릭
   - 팝업 창이 열리며 CHZZK 로그인 페이지로 이동
   - 로그인 완료 후 자동으로 `code`와 `state`가 입력됨
3. **인증 완료**: 자동 입력된 코드 확인 후 "인증 완료" 버튼 클릭
4. **연결**: "📡 채팅 서버 연결" 버튼을 클릭하면 실시간 메시지가 표시됩니다

#### CHZZK 개발자 등록

1. [CHZZK 개발자 포털](https://developers.naver.com/products/chzzk) 접속
2. 애플리케이션 등록
3. **중요**: Redirect URI에 `http://localhost:3000` 추가 (콜백 경로 없음)
4. Client ID와 Client Secret 확보

### 3. SOOP 사용하기

1. **초기화**: Client ID와 Client Secret 입력 (환경 변수 설정 시 자동 입력됨)
   - "초기화 및 OAuth 시작" 버튼 클릭
   - SOOP SDK가 자동으로 OAuth 팝업을 엽니다
2. **인증**: 팝업에서 로그인 완료 후 리다이렉트된 URL에서 `code` 확인
   - URL 파라미터에 code가 포함되어 있으면 자동으로 입력됨
3. **인증 완료**: "인증 완료" 버튼 클릭
4. **연결**: "📡 채팅 서버 연결" 버튼 클릭

#### SOOP 개발자 등록

1. [SOOP 개발자 센터](https://developers.sooplive.co.kr/) 접속
2. 애플리케이션 등록
3. Client ID와 Client Secret 확보

## 주요 기능

- ✅ **플랫폼 선택 UI** - 현대적이고 직관적인 디자인
- ✅ **팝업 OAuth 인증** - CHZZK 인증 코드 자동 입력
- ✅ **환경 변수 지원** - API 키 자동 입력
- ✅ **실시간 채팅** - 메시지 실시간 수신 및 표시
- ✅ **CHZZK WebSocket** - WebSocket 기반 연결
- ✅ **SOOP SDK 통합** - 외부 SDK 자동 로드
- ✅ **시스템 이벤트** - SOOP 이벤트 모니터링
- ✅ **상태 표시** - 연결 상태 실시간 업데이트
- ✅ **반응형 디자인** - 모바일/데스크톱 지원

## 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

## 미리보기

빌드된 애플리케이션을 미리 볼 수 있습니다:

```bash
npm run preview
```

## 기술 스택

- React 18
- TypeScript
- Vite
- PolyChat Bridge
