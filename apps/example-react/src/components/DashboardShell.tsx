import type { ReactNode } from 'react';
import { BrandMark, Icon } from './ui';

interface Props {
  configured: boolean;
  testMode: boolean;
  selectedCount: number;
  connectedCount: number;
  messageCount: number;
  isInitializing: boolean;
  onReset: () => void;
  onToggleTest: () => void;
  children: ReactNode;
}

export default function DashboardShell({
  configured,
  testMode,
  selectedCount,
  connectedCount,
  messageCount,
  isInitializing,
  onReset,
  onToggleTest,
  children,
}: Props) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        본문으로 이동
      </a>
      <aside className="sidebar">
        <a className="brand" href="/">
          <BrandMark />
          <span>
            polychat<span className="brand-period">.</span>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-avatar">P</span>
          <span>
            나의 워크스페이스<small>Personal workspace</small>
          </span>
          <span className="workspace-dot" />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="메인 메뉴">
          <button
            className={!configured ? 'nav-item active' : 'nav-item'}
            onClick={configured ? onReset : undefined}
            disabled={isInitializing}
            aria-current={!configured ? 'page' : undefined}
          >
            <Icon name="grid" />
            <span>플랫폼 연결</span>
            <span className="nav-count">3</span>
          </button>
          <div
            className={configured ? 'nav-item active' : 'nav-item muted'}
            aria-current={configured ? 'page' : undefined}
          >
            <Icon name="chat" />
            <span>통합 채팅</span>
            {configured && <span className="nav-live-dot" />}
          </div>
        </nav>
        <div className="nav-label resource-label">RESOURCES</div>
        <a
          className="nav-item"
          href="https://github.com/Thedum2/Poly_chat#api-사용법"
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="book" />
          <span>시작 가이드</span>
          <Icon name="external" size={14} />
        </a>
        <a
          className="nav-item"
          href="https://github.com/Thedum2/Poly_chat"
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="code" />
          <span>GitHub</span>
          <Icon name="external" size={14} />
        </a>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">
              <Icon name="bolt" size={19} />
            </span>
            <strong>
              연결은 간단하게.
              <br />
              소통은 더 가깝게.
            </strong>
            <p>
              흩어진 플랫폼의 이야기를
              <br />
              하나의 공간에서 만나보세요.
            </p>
            <span className="note-decoration" aria-hidden="true">
              ✳
            </span>
          </div>
          <div className="sidebar-footer">
            <span className="status-dot" />
            PolyChat Bridge<span>DEMO</span>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>워크스페이스</span>
            <Icon name="chevron" size={13} />
            <strong>{configured ? '통합 채팅' : '플랫폼 연결'}</strong>
          </div>
          <div className="topbar-end">
            <span className="demo-badge">DEMO WORKSPACE</span>
            <span className="user-avatar" aria-label="개인 워크스페이스">
              P
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">YOUR CHAT, ALL TOGETHER</div>
              <h1>
                {configured ? '모든 이야기가 모이는 곳' : '모든 채팅, 하나의 공간.'}
                <span className="heading-dot">✳</span>
              </h1>
              <p>
                {configured
                  ? '플랫폼을 연결하고 시청자들의 이야기를 실시간으로 만나보세요.'
                  : '방송 중인 플랫폼을 연결하고, 더 가까이 소통해 보세요.'}
              </p>
            </div>
            {configured ? (
              <div className="heading-actions">
                <button
                  className={`button ${testMode ? 'button-test-active' : 'button-primary'}`}
                  onClick={onToggleTest}
                >
                  <Icon name={testMode ? 'stop' : 'play'} size={16} />
                  {testMode ? '테스트 중지' : '테스트 모드'}
                </button>
                <button
                  className="button button-secondary icon-button"
                  onClick={onReset}
                aria-label="연결 재설정"
                disabled={isInitializing}
                  title="연결 재설정"
                >
                  <Icon name="reset" size={17} />
                </button>
              </div>
            ) : (
              <div className="setup-status">
                <span className="status-dot" />
                연결을 준비하고 있어요
              </div>
            )}
          </section>

          <section className="stats-row" aria-label="워크스페이스 현황">
            <div className="stat-item">
              <span className="stat-icon">
                <Icon name="grid" />
              </span>
              <div>
                <span className="stat-label">선택한 플랫폼</span>
                <div className="stat-value">
                  {selectedCount}
                  <span>/ 3</span>
                </div>
              </div>
              <span className="stat-description">함께할 채널</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon mint">
                <Icon name="plug" />
              </span>
              <div>
                <span className="stat-label">연결된 플랫폼</span>
                <div className="stat-value">
                  {connectedCount}
                  <span>개</span>
                </div>
              </div>
              <span className={`stat-tag ${connectedCount ? 'online' : ''}`}>
                {connectedCount ? '연결 중' : '연결 대기'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-icon peach">
                <Icon name="chat" />
              </span>
              <div>
                <span className="stat-label">세션 메시지</span>
                <div className="stat-value">
                  {messageCount.toLocaleString()}
                  <span>개</span>
                </div>
              </div>
              <span className="stat-description">이번 세션</span>
            </div>
          </section>

          {children}
          <footer className="page-footer">
            <span>서로 다른 플랫폼, 함께 나누는 이야기.</span>
            <span>
              Made for connection <span className="footer-spark">✳</span> PolyChat
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
