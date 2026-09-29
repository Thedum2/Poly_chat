import { useLayoutEffect, useRef } from 'react';
import type { AdapterState, DisplayMessage, Platform } from '../types';
import { Icon, PLATFORM_INFO, PlatformMark, StatusBadge } from './ui';

interface Props {
  selectedPlatforms: Set<Platform>;
  adapters: Map<Platform, AdapterState>;
  messages: DisplayMessage[];
  testMode: boolean;
  onInit: (platform: Platform) => void;
  onAuthenticate: (platform: Platform) => void;
  onConnect: (platform: Platform) => void;
  onDisconnect: (platform: Platform) => void;
  onToggleTest: () => void;
}

export default function ChatView({
  selectedPlatforms,
  adapters,
  messages,
  testMode,
  onInit,
  onAuthenticate,
  onConnect,
  onDisconnect,
  onToggleTest,
}: Props) {
  const chatRef = useRef<HTMLDivElement>(null);
  const followingLatestRef = useRef(true);

  useLayoutEffect(() => {
    const container = chatRef.current;
    if (container && followingLatestRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const connectedCount = Array.from(adapters.values()).filter(
    (adapter) => adapter.status === 'connected'
  ).length;

  return (
    <div className="console-layout">
      <section className="connections-panel" aria-label="플랫폼 연결 관리">
        <div className="console-section-heading">
          <h2>내 플랫폼</h2>
          <span>{selectedPlatforms.size}개 플랫폼</span>
        </div>
        {Array.from(selectedPlatforms).map((platform) => {
          const state = adapters.get(platform);
          const status = state?.status || 'disconnected';
          return (
            <article className="panel connection-card" key={platform}>
              <div className="connection-title">
                <PlatformMark platform={platform} small />
                <h3>{PLATFORM_INFO[platform].name}</h3>
                <StatusBadge status={status} />
              </div>
              {state?.broadcasterInfo ? (
                <div className="broadcaster">
                  <img src={state.broadcasterInfo.profileImageUrl} alt="" />
                  <div>
                    <strong>{state.broadcasterInfo.nickname}</strong>
                    <span>방송인 계정</span>
                  </div>
                </div>
              ) : (
                <p className="connection-description">
                  {state?.isInitializing
                    ? '로그인 창에서 인증을 완료해 주세요. 창을 닫으면 취소됩니다.'
                    : status === 'disconnected'
                      ? '플랫폼 계정을 연결해 대화를 시작하세요.'
                      : status === 'initialized'
                        ? '초기화가 완료됐어요. 인증을 진행해 주세요.'
                        : status === 'authenticated'
                          ? '인증이 완료됐어요. 채팅에 연결해 주세요.'
                          : '실시간으로 채팅을 수신하고 있어요.'}
                </p>
              )}
              <ol className="connection-steps" aria-label="연결 진행 단계">
                {['초기화', '인증', '연결'].map((label, index) => {
                  const completed =
                    ['disconnected', 'initialized', 'authenticated', 'connected'].indexOf(status) >
                    index;
                  return (
                    <li key={label} className={completed ? 'complete' : ''}>
                      <span>{completed ? <Icon name="check" size={10} /> : index + 1}</span>
                      {label}
                    </li>
                  );
                })}
              </ol>
              {state?.error && (
                <div className="error-message" role="alert">
                  {state.error}
                </div>
              )}
              {status === 'disconnected' && (
                <button
                  className="button button-secondary connection-button"
                  onClick={() => onInit(platform)}
                  disabled={state?.isInitializing}
                >
                  {state?.isInitializing ? '로그인 대기 중…' : '초기화'}
                  <Icon name="arrow" size={15} />
                </button>
              )}
              {status === 'initialized' && (
                <button
                  className="button button-primary connection-button"
                  onClick={() => onAuthenticate(platform)}
                >
                  인증
                  <Icon name="shield" size={15} />
                </button>
              )}
              {status === 'authenticated' && (
                <button
                  className="button button-primary connection-button"
                  onClick={() => onConnect(platform)}
                >
                  연결
                  <Icon name="plug" size={15} />
                </button>
              )}
              {status === 'connected' && (
                <button
                  className="button button-disconnect connection-button"
                  onClick={() => onDisconnect(platform)}
                >
                  연결 해제
                  <Icon name="plug" size={15} />
                </button>
              )}
            </article>
          );
        })}
        <div className="connection-tip">
          <Icon name="shield" size={17} />
          <p>초기화 → 인증 → 연결 순서로 진행하면 채팅을 받을 수 있어요.</p>
        </div>
      </section>

      <section className="panel chat-panel" aria-label="통합 채팅">
        <div className="chat-header">
          <div className="chat-heading">
            <span className="chat-heading-icon">
              <Icon name="chat" />
            </span>
            <div>
              <h2>통합 채팅</h2>
              <p>모든 플랫폼의 이야기를 한눈에</p>
            </div>
          </div>
          <span className={`chat-mode ${testMode ? 'test' : connectedCount ? 'live' : ''}`}>
            <span className="status-dot" />
            {testMode ? '테스트 모드' : connectedCount ? 'LIVE' : '연결 대기'}
          </span>
        </div>
        <div className="chat-toolbar">
          <div className="chat-platforms">
            {Array.from(selectedPlatforms).map((platform) => (
              <span key={platform}>
                <span className={`platform-dot ${platform}`} />
                {PLATFORM_INFO[platform].name}
              </span>
            ))}
          </div>
          <span>{messages.length.toLocaleString()}개 메시지</span>
        </div>
        {testMode && (
          <div className="test-notice">
            <Icon name="play" size={13} />
            샘플 메시지를 생성하고 있어요. 실제 방송 채팅과는 별개입니다.
          </div>
        )}
        <div
          className="chat-messages"
          ref={chatRef}
          onScroll={(event) => {
            const container = event.currentTarget;
            followingLatestRef.current =
              container.scrollHeight - container.scrollTop - container.clientHeight <= 32;
          }}
          role="log"
          aria-label="수신 메시지"
          aria-live="off"
          tabIndex={0}
        >
          {messages.length === 0 ? (
            <div className="chat-empty">
              <div className="empty-chat-art">
                <Icon name="chat" size={38} />
                <span>✳</span>
              </div>
              <h3>첫 번째 이야기를 기다리고 있어요</h3>
              <p>
                플랫폼을 연결하면 이곳에 채팅이 모여요.
                <br />
                테스트 모드로 먼저 둘러볼 수도 있어요.
              </p>
              <button className="button button-secondary" onClick={onToggleTest}>
                <Icon name={testMode ? 'stop' : 'play'} size={14} />
                {testMode ? '테스트 중지' : '테스트 모드 시작'}
              </button>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.chat_id || 'message'}-${index}`}
                className={`chat-message ${message.type === 'system' ? 'system-message' : ''}`}
              >
                <PlatformMark platform={message.platform} small />
                <div className="message-body">
                  <div className="message-meta">
                    <strong>{message.nickname}</strong>
                    <span className={`message-platform ${message.platform}`}>
                      {PLATFORM_INFO[message.platform].name}
                    </span>
                    {message.chat_id?.startsWith('test-') && (
                      <span className="sample-label">샘플</span>
                    )}
                    <time>
                      {message.timestamp.toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </time>
                  </div>
                  <p>{message.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="chat-footer">
          <span>
            <Icon name="activity" size={14} />
            {testMode
              ? '샘플 메시지 수신 중'
              : connectedCount
                ? `${connectedCount}개 플랫폼에서 수신 중`
                : '플랫폼 연결을 기다리는 중'}
          </span>
          <span>읽기 전용 채팅</span>
        </div>
      </section>
    </div>
  );
}
