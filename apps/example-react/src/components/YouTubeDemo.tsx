import {useState, useEffect, useRef} from 'react';
import {YouTubeAdapter, ChatMessage} from 'polychat-bridge';

export function YouTubeDemo() {
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [redirectUri, setRedirectUri] = useState('http://localhost:3000/callback');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [status, setStatus] = useState<'disconnected' | 'initialized' | 'authenticated' | 'connected'>('disconnected');
    const [error, setError] = useState('');

    const adapterRef = useRef<YouTubeAdapter | null>(null);


    useEffect(() => {
        const envClientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID;
        const envClientSecret = import.meta.env.VITE_YOUTUBE_CLIENT_SECRET;
        if (envClientId) setClientId(envClientId);
        if (envClientSecret) setClientSecret(envClientSecret);
    }, []);

    const handleInit = async () => {
        try {
            setError('');

            const adapter = new YouTubeAdapter();
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

            // Implicit Flow: init()에서 팝업을 열고 accessToken을 자동으로 store에 저장
            await adapter.init({
                clientId,
                clientSecret,
                redirectUri,
            });

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
            // Implicit Flow: store에 저장된 accessToken 확인만 함
            await adapterRef.current.authenticate({});
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
                <h2>📺 YouTube</h2>
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
                <strong>💡 참고:</strong> YouTube는 OAuth 2.0 Implicit Flow를 사용하여 팝업에서 Access Token을 바로 받습니다. 폴링 방식으로 채팅 메시지를 가져오며, 활성 라이브 스트리밍이 필요합니다.
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
                        placeholder="YouTube Client ID 입력"
                        disabled={status !== 'disconnected'}
                    />
                </div>
                <div className="form-group">
                    <label>Client Secret</label>
                    <input
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        placeholder="YouTube Client Secret 입력"
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
                    <div className="auth-success">
                        <p>✅ OAuth 팝업에서 Access Token을 자동으로 받았습니다!</p>
                        <p>아래 버튼을 클릭하여 인증을 완료하세요.</p>
                    </div>
                )}

                <button
                    className="btn btn-primary"
                    onClick={handleAuthenticate}
                    disabled={status !== 'initialized'}
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
