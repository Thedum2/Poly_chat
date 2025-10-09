import { useState, useEffect, useRef } from 'react';
import { ChzzkAdapter, ChatMessage } from 'polychat-bridge';

export function ChzzkDemo() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri] = useState('http://localhost:3000');
  const [authUrl, setAuthUrl] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState('');

  const adapterRef = useRef<ChzzkAdapter | null>(null);
  const popupRef = useRef<Window | null>(null);
  const popupCheckInterval = useRef<number | null>(null);

  // Load from env if available
  useEffect(() => {
    const envClientId = import.meta.env.VITE_CHZZK_CLIENT_ID;
    const envClientSecret = import.meta.env.VITE_CHZZK_CLIENT_SECRET;

    if (envClientId) setClientId(envClientId);
    if (envClientSecret) setClientSecret(envClientSecret);
  }, []);

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    const stateParam = params.get('state');

    if (codeParam && stateParam) {
      setCode(codeParam);
      setState(stateParam);
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Cleanup popup on unmount
  useEffect(() => {
    return () => {
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  const handleInit = async () => {
    try {
      setError('');
      const adapter = new ChzzkAdapter();
      adapterRef.current = adapter;

      adapter.on('message', (message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);
      });

      adapter.on('error', (err: Error) => {
        setError(err.message);
      });

      adapter.on('connected', () => {
        setStatus('connected');
      });

      adapter.on('disconnected', () => {
        setStatus('disconnected');
      });

      adapter.on('auth', (isAuth: boolean) => {
        setStatus(isAuth ? 'authenticated' : 'disconnected');
      });

      const url = await adapter.init({
        clientId,
        redirectUri,
      });

      setAuthUrl(url);
      setStatus('initialized');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openAuthPopup = () => {
    if (!authUrl) return;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    popupRef.current = window.open(
      authUrl,
      'CHZZK OAuth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Check popup URL for redirect
    if (popupCheckInterval.current) {
      clearInterval(popupCheckInterval.current);
    }

    popupCheckInterval.current = window.setInterval(() => {
      try {
        if (!popupRef.current || popupRef.current.closed) {
          if (popupCheckInterval.current) {
            clearInterval(popupCheckInterval.current);
          }
          return;
        }

        const popupUrl = popupRef.current.location.href;

        if (popupUrl.includes('localhost:3000')) {
          const params = new URLSearchParams(popupRef.current.location.search);
          const codeParam = params.get('code');
          const stateParam = params.get('state');

          if (codeParam && stateParam) {
            setCode(codeParam);
            setState(stateParam);

            popupRef.current.close();
            if (popupCheckInterval.current) {
              clearInterval(popupCheckInterval.current);
            }
          }
        }
      } catch (err) {
        // Cross-origin error - popup is still on OAuth provider
      }
    }, 500) as unknown as number;
  };

  const handleAuthenticate = async () => {
    if (!adapterRef.current) {
      setError('먼저 초기화를 진행해주세요.');
      return;
    }

    try {
      setError('');
      await adapterRef.current.authenticate({
        clientId,
        clientSecret,
        redirectUri,
        code,
        state,
      });
      setStatus('authenticated');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConnect = async () => {
    if (!adapterRef.current) {
      setError('먼저 인증을 완료해주세요.');
      return;
    }

    try {
      setError('');
      await adapterRef.current.connect();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDisconnect = async () => {
    if (!adapterRef.current) return;

    try {
      await adapterRef.current.disconnect();
      setStatus('disconnected');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="demo-content">
      <div className="demo-header">
        <h2>🎮 CHZZK</h2>
        <div className={`status-badge status-${status}`}>
          {status === 'connected' && '🟢 연결됨'}
          {status === 'authenticated' && '🟡 인증됨'}
          {status === 'initialized' && '🟡 초기화됨'}
          {status === 'disconnected' && '⚪ 연결 안됨'}
        </div>
      </div>

      {error && (
        <div className="error-box">
          <strong>⚠️ 오류:</strong> {error}
        </div>
      )}

      {/* Step 1: Initialize */}
      {status === 'disconnected' && (
        <div className="step-card">
          <h3>1️⃣ 초기화</h3>
          <div className="form-group">
            <label>Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="CHZZK Client ID 입력"
            />
          </div>
          <div className="form-group">
            <label>Client Secret</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="CHZZK Client Secret 입력"
            />
          </div>
          <div className="form-group">
            <label>Redirect URI</label>
            <input
              type="text"
              value={redirectUri}
              disabled
              className="disabled-input"
            />
          </div>
          <button className="btn btn-primary" onClick={handleInit}>
            초기화
          </button>
        </div>
      )}

      {/* Step 2: Authenticate */}
      {status === 'initialized' && (
        <div className="step-card">
          <h3>2️⃣ 인증</h3>
          <button className="btn btn-auth" onClick={openAuthPopup}>
            🔐 팝업으로 인증하기
          </button>

          {(code || state) && (
            <div className="auth-success">
              <p>✅ 인증 코드가 자동으로 입력되었습니다!</p>
            </div>
          )}

          <div className="form-group">
            <label>Authorization Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="자동 입력됨 (또는 수동 입력)"
            />
          </div>
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="자동 입력됨 (또는 수동 입력)"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAuthenticate}
            disabled={!code || !state}
          >
            인증 완료
          </button>
        </div>
      )}

      {/* Step 3: Connect */}
      {status === 'authenticated' && (
        <div className="step-card">
          <h3>3️⃣ 연결</h3>
          <button className="btn btn-success" onClick={handleConnect}>
            📡 채팅 서버 연결
          </button>
        </div>
      )}

      {/* Connected */}
      {status === 'connected' && (
        <div className="step-card">
          <h3>✅ 연결됨</h3>
          <button className="btn btn-danger" onClick={handleDisconnect}>
            🔌 연결 해제
          </button>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="messages-card">
          <h3>💬 채팅 메시지 ({messages.length})</h3>
          <div className="messages-list">
            {messages.map((msg, idx) => (
              <div key={idx} className="message-item">
                <div className="message-header">
                  <strong className="message-author">{msg.nickname}</strong>
                  <span className="message-time">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
