import { useState, useRef, useEffect } from 'react';
import './App.css';
import { ChzzkAdapter, SoopAdapter, YouTubeAdapter, ChatMessage } from 'polychat-bridge';

type Platform = 'chzzk' | 'soop' | 'youtube';

interface PlatformConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

interface AdapterState {
  adapter: ChzzkAdapter | SoopAdapter | YouTubeAdapter;
  status: 'disconnected' | 'initialized' | 'authenticated' | 'connected';
  error: string;
  config: PlatformConfig;
}

function App() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(new Set());
  const [adapters, setAdapters] = useState<Map<Platform, AdapterState>>(new Map());
  const [messages, setMessages] = useState<(ChatMessage & { platform: Platform })[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);

  // Platform configurations
  const [configs, setConfigs] = useState<Record<Platform, PlatformConfig>>({
    chzzk: {
      clientId: import.meta.env.VITE_CHZZK_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_CHZZK_CLIENT_SECRET || '',
      redirectUri: 'http://localhost:3000/callback',
    },
    soop: {
      clientId: import.meta.env.VITE_SOOP_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_SOOP_CLIENT_SECRET || '',
    },
    youtube: {
      clientId: import.meta.env.VITE_YOUTUBE_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_YOUTUBE_CLIENT_SECRET || '',
      redirectUri: 'http://localhost:3000/callback',
    },
  });

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  };

  const updateConfig = (platform: Platform, key: keyof PlatformConfig, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [key]: value,
      },
    }));
  };

  const handleConfigure = () => {
    if (selectedPlatforms.size === 0) {
      alert('최소 하나의 플랫폼을 선택해주세요.');
      return;
    }
    setIsConfigured(true);
  };

  const handleInit = async (platform: Platform) => {
    const config = configs[platform];

    try {
      let adapter: ChzzkAdapter | SoopAdapter | YouTubeAdapter;

      if (platform === 'chzzk') {
        adapter = new ChzzkAdapter();
      } else if (platform === 'soop') {
        adapter = new SoopAdapter();
      } else {
        adapter = new YouTubeAdapter();
      }

      // Set up event listeners
      adapter.on('message', (message: ChatMessage) => {
        setMessages((prev) => [...prev, { ...message, platform }]);
      });

      adapter.on('error', (err: Error) => {
        updateAdapterState(platform, { error: err.message });
      });

      adapter.on('connected', () => {
        updateAdapterState(platform, { status: 'connected' });
      });

      adapter.on('disconnected', () => {
        updateAdapterState(platform, { status: 'disconnected' });
      });

      adapter.on('auth', (isAuth: boolean) => {
        updateAdapterState(platform, { status: isAuth ? 'authenticated' : 'disconnected' });
      });

      // Initialize - init now handles code internally
      await adapter.init(config);

      setAdapters((prev) => {
        const next = new Map(prev);
        next.set(platform, {
          adapter,
          status: 'initialized',
          error: '',
          config: { ...config },
        });
        return next;
      });
    } catch (err: any) {
      updateAdapterState(platform, { error: err.message });
    }
  };

  const handleAuthenticate = async (platform: Platform) => {
    const adapterState = adapters.get(platform);
    if (!adapterState) return;

    try {
      const config = configs[platform];
      await adapterState.adapter.authenticate(config);
      updateAdapterState(platform, { status: 'authenticated', error: '' });
    } catch (err: any) {
      updateAdapterState(platform, { error: err.message });
    }
  };

  const handleConnect = async (platform: Platform) => {
    const adapterState = adapters.get(platform);
    if (!adapterState) return;

    try {
      await adapterState.adapter.connect();
      updateAdapterState(platform, { error: '' });
    } catch (err: any) {
      updateAdapterState(platform, { error: err.message });
    }
  };

  const handleDisconnect = async (platform: Platform) => {
    const adapterState = adapters.get(platform);
    if (!adapterState) return;

    try {
      await adapterState.adapter.disconnect();
      updateAdapterState(platform, { status: 'disconnected', error: '' });
    } catch (err: any) {
      updateAdapterState(platform, { error: err.message });
    }
  };

  const updateAdapterState = (platform: Platform, updates: Partial<AdapterState>) => {
    setAdapters((prev) => {
      const next = new Map(prev);
      const current = next.get(platform);
      if (current) {
        next.set(platform, { ...current, ...updates });
      }
      return next;
    });
  };

  const handleReset = () => {
    adapters.forEach((state, platform) => {
      state.adapter.disconnect().catch(() => {});
    });
    setAdapters(new Map());
    setMessages([]);
    setIsConfigured(false);
  };

  const getPlatformName = (platform: Platform) => {
    switch (platform) {
      case 'chzzk': return 'CHZZK';
      case 'soop': return 'SOOP';
      case 'youtube': return 'YouTube';
    }
  };

  const getPlatformColor = (platform: Platform) => {
    switch (platform) {
      case 'chzzk': return '#00e7a0';
      case 'soop': return '#ff6b00';
      case 'youtube': return '#ff0000';
    }
  };

  if (!isConfigured) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>PolyChat</h1>
          <p>Multi-Platform Chat Bridge</p>
        </header>

        <div className="configuration-container">
          <div className="config-section">
            <h2>플랫폼 선택</h2>
            <div className="platform-checkboxes">
              {(['chzzk', 'soop', 'youtube'] as Platform[]).map((platform) => (
                <label key={platform} className={`platform-checkbox ${selectedPlatforms.has(platform) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.has(platform)}
                    onChange={() => togglePlatform(platform)}
                  />
                  <span className="checkbox-label">{getPlatformName(platform)}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedPlatforms.size > 0 && (
            <>
              {Array.from(selectedPlatforms).map((platform) => (
                <div key={platform} className="config-section">
                  <h3>{getPlatformName(platform)} 설정</h3>
                  <div className="config-form">
                    <div className="form-field">
                      <label>Client ID</label>
                      <input
                        type="text"
                        value={configs[platform].clientId}
                        onChange={(e) => updateConfig(platform, 'clientId', e.target.value)}
                        placeholder="Client ID 입력"
                      />
                    </div>
                    <div className="form-field">
                      <label>Client Secret</label>
                      <input
                        type="password"
                        value={configs[platform].clientSecret}
                        onChange={(e) => updateConfig(platform, 'clientSecret', e.target.value)}
                        placeholder="Client Secret 입력"
                      />
                    </div>
                    {(platform === 'chzzk' || platform === 'youtube') && (
                      <div className="form-field">
                        <label>Redirect URI</label>
                        <input
                          type="text"
                          value={configs[platform].redirectUri || ''}
                          onChange={(e) => updateConfig(platform, 'redirectUri', e.target.value)}
                          placeholder="Redirect URI 입력"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button className="btn-primary" onClick={handleConfigure}>
                다음
              </button>
            </>
          )}
        </div>

        <footer className="app-footer">
          <p>Powered by <strong>PolyChat</strong></p>
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>PolyChat</h1>
        <button className="btn-reset" onClick={handleReset}>
          재설정
        </button>
      </header>

      <div className="main-container">
        {/* Control Panel */}
        <div className="control-panel">
          {Array.from(selectedPlatforms).map((platform) => {
            const state = adapters.get(platform);
            const status = state?.status || 'disconnected';
            const error = state?.error || '';

            return (
              <div key={platform} className="platform-control">
                <div className="platform-control-header">
                  <h3 style={{ color: getPlatformColor(platform) }}>{getPlatformName(platform)}</h3>
                  <span className={`status-indicator status-${status}`}>
                    {status === 'connected' && '● 연결됨'}
                    {status === 'authenticated' && '● 인증됨'}
                    {status === 'initialized' && '● 초기화됨'}
                    {status === 'disconnected' && '○ 연결 안됨'}
                  </span>
                </div>

                {error && (
                  <div className="error-message">⚠ {error}</div>
                )}

                <div className="platform-controls">
                  {status === 'disconnected' && (
                    <button
                      className="btn-control"
                      onClick={() => handleInit(platform)}
                    >
                      초기화
                    </button>
                  )}

                  {status === 'initialized' && (
                    <button
                      className="btn-control"
                      onClick={() => handleAuthenticate(platform)}
                    >
                      인증
                    </button>
                  )}

                  {status === 'authenticated' && (
                    <button
                      className="btn-control btn-connect"
                      onClick={() => handleConnect(platform)}
                    >
                      연결
                    </button>
                  )}

                  {status === 'connected' && (
                    <button
                      className="btn-control btn-disconnect"
                      onClick={() => handleDisconnect(platform)}
                    >
                      연결 해제
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat Display */}
        <div className="chat-panel">
          <div className="chat-header">
            <h2>통합 채팅</h2>
            <span className="message-count">{messages.length} 메시지</span>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                채팅 메시지가 없습니다
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="chat-message">
                  <span
                    className="platform-badge"
                    style={{ backgroundColor: getPlatformColor(msg.platform) }}
                  >
                    {getPlatformName(msg.platform)}
                  </span>
                  <div className="message-body">
                    <div className="message-meta">
                      <span className="message-author">{msg.nickname}</span>
                      <span className="message-time">{msg.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <div className="message-text">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <p>Powered by <strong>PolyChat</strong></p>
      </footer>
    </div>
  );
}

export default App;
