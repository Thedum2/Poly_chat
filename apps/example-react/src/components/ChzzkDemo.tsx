import { useState, useEffect, useRef } from 'react';
import { ChzzkAdapter, ChatMessage } from 'polychat-bridge';

export function ChzzkDemo() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://localhost:3000/callback');
  const [code, setCode] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'disconnected' | 'initialized' | 'authenticated' | 'connected'>('disconnected');
  const [error, setError] = useState('');

  const adapterRef = useRef<ChzzkAdapter | null>(null);

  // Load from env and localStorage on mount
  useEffect(() => {
    const envClientId = import.meta.env.VITE_CHZZK_CLIENT_ID;
    const envClientSecret = import.meta.env.VITE_CHZZK_CLIENT_SECRET;
    if (envClientId) setClientId(envClientId);
    if (envClientSecret) setClientSecret(envClientSecret);
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

      const authCode = await adapter.init({
        clientId,
        clientSecret,
        redirectUri,
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
      // state는 adapter 내부에서 관리되므로 전달하지 않아도 됨
      await adapterRef.current.authenticate({
        clientId,
        clientSecret,
        redirectUri,
        code,
        state: '', // adapter가 내부 state를 사용
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

      <div className="info-box">
        <strong>💡 참고:</strong> 초기화 시 OAuth 팝업이 자동으로 열립니다. 팝업 차단을 해제해주세요.
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
            placeholder="CHZZK Client ID 입력"
            disabled={status !== 'disconnected'}
          />
        </div>
        <div className="form-group">
          <label>Client Secret</label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="CHZZK Client Secret 입력"
            disabled={status !== 'disconnected'}
          />
        </div>
        <div className="form-group">
          <label>Redirect URI</label>
          <input
            type="text"
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            placeholder="Redirect URI 입력"
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
    </div>
  );
}
