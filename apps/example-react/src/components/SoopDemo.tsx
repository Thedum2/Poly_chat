import { useState, useEffect, useRef } from 'react';
import { SoopAdapter, ChatMessage } from 'polychat-bridge';

export function SoopDemo() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [code, setCode] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'disconnected' | 'initialized' | 'authenticated' | 'connected'>('disconnected');
  const [error, setError] = useState('');
  const [systemEvents, setSystemEvents] = useState<any[]>([]);

  const adapterRef = useRef<SoopAdapter | null>(null);

  // Load from env and localStorage on mount
  useEffect(() => {
    const envClientId = import.meta.env.VITE_SOOP_CLIENT_ID;
    const envClientSecret = import.meta.env.VITE_SOOP_CLIENT_SECRET;
    const savedClientId = localStorage.getItem('soop_client_id');
    const savedClientSecret = localStorage.getItem('soop_client_secret');

    if (savedClientId) setClientId(savedClientId);
    else if (envClientId) setClientId(envClientId);

    if (savedClientSecret) setClientSecret(savedClientSecret);
    else if (envClientSecret) setClientSecret(envClientSecret);
  }, []);

  // No need to handle OAuth redirect anymore - using popup instead

  const handleInit = async () => {
    try {
      setError('');
      localStorage.setItem('soop_client_id', clientId);
      localStorage.setItem('soop_client_secret', clientSecret);

      const adapter = new SoopAdapter();
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

      adapter.on('system', (event: any) => {
        setSystemEvents((prev) => [...prev, event]);
      });

      const authCode = await adapter.init({
        clientId,
        clientSecret,
      });

      setCode(authCode);
      setStatus('initialized');
    } catch (err: any) {
      setError(err.message);
    }
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
        code,
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
        <h2>🎪 SOOP</h2>
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

      <div className="info-box">
        <strong>💡 참고:</strong> SOOP은 외부 SDK를 로드하며, 초기화 시 OAuth 팝업이 열립니다. 팝업 차단을 해제해주세요.
      </div>

      {/* Step 1: Initialize */}
      <div className="step-card">
        <h3>{status !== 'disconnected' ? '✅' : '1️⃣'} 초기화</h3>
        <div className="form-group">
          <label>Client ID</label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="SOOP Client ID 입력"
            disabled={status !== 'disconnected'}
          />
        </div>
        <div className="form-group">
          <label>Client Secret</label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="SOOP Client Secret 입력"
            disabled={status !== 'disconnected'}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={handleInit}
          disabled={status !== 'disconnected'}
        >
          초기화 및 OAuth 시작
        </button>
      </div>

      {/* Step 2: Authenticate */}
      <div className="step-card">
        <h3>{status === 'authenticated' || status === 'connected' ? '✅' : '2️⃣'} 인증</h3>
        {status === 'initialized' && (
          <p>OAuth 팝업에서 인증을 완료한 후, 인증을 진행하세요.</p>
        )}

        {code && (
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
            disabled={status !== 'initialized'}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={handleAuthenticate}
          disabled={status !== 'initialized' || !code}
        >
          인증 완료
        </button>
      </div>

      {/* Step 3: Connect */}
      <div className="step-card">
        <h3>{status === 'connected' ? '✅' : '3️⃣'} 연결</h3>
        <button
          className="btn btn-success"
          onClick={handleConnect}
          disabled={status !== 'authenticated'}
        >
          📡 채팅 서버 연결
        </button>
        {status === 'connected' && (
          <button className="btn btn-danger" onClick={handleDisconnect} style={{marginLeft: '10px'}}>
            🔌 연결 해제
          </button>
        )}
      </div>

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

      {/* System Events */}
      {systemEvents.length > 0 && (
        <div className="events-card">
          <h3>🔔 시스템 이벤트 ({systemEvents.length})</h3>
          <div className="events-list">
            {systemEvents.slice(-10).reverse().map((event, idx) => (
              <div key={idx} className="event-item">
                <strong>{event.action}</strong>
                <pre>{JSON.stringify(event.payload, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
