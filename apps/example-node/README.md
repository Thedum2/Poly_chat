# PolyChat Node.js Example

콘솔에서 PolyChat을 테스트할 수 있는 예제 애플리케이션입니다.

## 설치

```bash
cd apps/example-node
npm install
```

## 실행

```bash
npm start
```

또는 루트 디렉토리에서:

```bash
npm run demo
```

## 사용 방법

1. 애플리케이션을 실행하면 플랫폼 선택 메뉴가 나타납니다.
2. CHZZK 또는 SOOP을 선택합니다.
3. 각 플랫폼의 인증 정보를 입력합니다.
4. 인증이 완료되면 채팅 메시지가 실시간으로 콘솔에 표시됩니다.

## CHZZK 설정

1. [CHZZK 개발자 포털](https://developers.naver.com/products/chzzk)에서 애플리케이션을 등록합니다.
2. Client ID, Client Secret, Redirect URI를 받아옵니다.
3. 프로그램 실행 시 이 정보들을 입력합니다.
4. 생성된 인증 URL로 접속하여 인증을 완료합니다.
5. 리다이렉트된 URL에서 `code`와 `state` 파라미터를 복사하여 입력합니다.

## SOOP 설정

**주의**: SOOP 어댑터는 브라우저 환경(window, document 객체)이 필요합니다.
Node.js 환경에서는 제한적으로 동작하므로, 웹 애플리케이션에서 사용하시는 것을 권장합니다.

## 환경 변수 (선택사항)

`.env.example` 파일을 `.env`로 복사하고 필요한 값을 입력할 수 있습니다:

```bash
cp .env.example .env
```

## 종료

`Ctrl+C`를 눌러 프로그램을 종료할 수 있습니다.
