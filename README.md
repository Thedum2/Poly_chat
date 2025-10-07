# POLYCHAT — Unified chat adapter for YouTube, Chzzk, Soop

YouTube, Chzzk, SOOP 등 서로 다른 인터넷 방송 플랫폼의 채팅 스트림을 하나의 공통 인터페이스로 다루는 TypeScript 라이브러리입니다.
플랫폼별 인증·전송 방식(REST 폴링, WebSocket, SDK 콜백)을 어댑터 패턴으로 캡슐화하여, 앱에서는 동일한 타입과 이벤트로 메시지를 처리합니다.
