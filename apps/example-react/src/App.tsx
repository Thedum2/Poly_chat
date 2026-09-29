import { useState, useEffect, useRef } from 'react';
import './App.css';
import { CHZZK_API_BASE_URL, SOOP_API_BASE_URL, YOUTUBE_API_BASE_URL, YOUTUBE_STREAM_URL, RELAY_API_BASE_URL } from './config';
import { ChzzkAdapter, SoopAdapter, YouTubeAdapter, ChatMessage, PolyChat, BroadcasterInfo } from 'polychat-bridge';

import type { AdapterState, DisplayMessage, Platform, PlatformConfig } from './types';
import DashboardShell from './components/DashboardShell';
import SetupView from './components/SetupView';
import ChatView from './components/ChatView';

function App() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(new Set());
  const [adapters, setAdapters] = useState<Map<Platform, AdapterState>>(new Map());
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [polyChat] = useState<PolyChat>(() => new PolyChat());
  const [isTestMode, setIsTestMode] = useState(false);
  const testModeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [isConfigured]);

  // Test mode: Simulate incoming messages
  useEffect(() => {
    if (isTestMode && isConfigured) {
      const platforms = Array.from(selectedPlatforms);
      const usernames = ['테스트유저1', '테스트유저2', '테스트유저3', '뷰어123', '시청자A', '팬B'];
      const messageContents = [
        '안녕하세요!',
        'ㅋㅋㅋㅋㅋㅋ',
        '오늘 방송 재밌네요',
        '구독했습니다!',
        '이거 어떻게 하는 거예요?',
        '대박 ㄷㄷㄷ',
        '감사합니다',
        '좋아요 눌렀어요',
        '첫 방문이에요',
        '방송 화이팅!',
      ];

      const generateRandomMessage = () => {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const username = usernames[Math.floor(Math.random() * usernames.length)];
        const content = messageContents[Math.floor(Math.random() * messageContents.length)];

        setMessages((prev) => [...prev, {
          platform,
          type: 'chat',
          nickname: username,
          content,
          timestamp: new Date(),
          chat_id: 'test-' + Math.random().toString(36).substring(7),
        }]);
      };

      // Keep sample conversations readable at a natural pace.
      const scheduleNextMessage = () => {
        const delay = 900 + Math.random() * 900;
        testModeIntervalRef.current = setTimeout(() => {
          generateRandomMessage();
          scheduleNextMessage();
        }, delay);
      };

      scheduleNextMessage();

      return () => {
        if (testModeIntervalRef.current) {
          clearTimeout(testModeIntervalRef.current);
          testModeIntervalRef.current = null;
        }
      };
    }
  }, [isTestMode, isConfigured, selectedPlatforms]);

  // Set up PolyChat event listeners
  useEffect(() => {
    const handleMessage = ({ platform, message }: { platform: string; message: ChatMessage }) => {
      console.log(`[${platform.toUpperCase()}] Message received:`, message);
      const isSystemMessage = message.nickname === 'SYSTEM';
      setMessages((prev) => [...prev, {
        platform: platform as Platform,
        type: isSystemMessage ? 'system' : 'chat',
        nickname: message.nickname,
        content: message.content,
        timestamp: message.timestamp,
        chat_id: message.chat_id,
      }]);
    };

    const handleError = ({ platform, error }: { platform: string; error: Error }) => {
      console.log(`[${platform.toUpperCase()}] Error:`, platform === 'chzzk' ? 'Request failed' : error);
      updateAdapterState(platform as Platform, { error: error.message });
      addSystemMessage(platform as Platform, `❌ 오류 발생: ${error.message}`);
    };

    const handleConnected = ({ platform }: { platform: string }) => {
      console.log(`[${platform.toUpperCase()}] Connected`);
      updateAdapterState(platform as Platform, { status: 'connected' });
      addSystemMessage(platform as Platform, '✅ 채팅 서버에 연결되었습니다');
    };

    const handleDisconnected = ({ platform }: { platform: string }) => {
      console.log(`[${platform.toUpperCase()}] Disconnected`);
      updateAdapterState(platform as Platform, { status: 'disconnected' });
      addSystemMessage(platform as Platform, '⚠️ 채팅 서버 연결이 해제되었습니다');
    };

    const handleAuth = ({ platform, broadcasterInfo }: { platform: string; broadcasterInfo: BroadcasterInfo | null }) => {
      console.log(`[${platform.toUpperCase()}] Auth:`, broadcasterInfo);
      if (polyChat.getAdapter(platform)?.isAuthenticated) {
        updateAdapterState(platform as Platform, {
          status: 'authenticated',
          broadcasterInfo,
          error: '',
        });
        addSystemMessage(platform as Platform, broadcasterInfo
          ? `🔑 인증 성공: ${broadcasterInfo.nickname}`
          : '🔑 인증 성공 (채널 정보를 가져오지 못했습니다)');
      } else {
        updateAdapterState(platform as Platform, {
          status: 'disconnected',
          broadcasterInfo: null
        });
        addSystemMessage(platform as Platform, '❌ 인증에 실패했습니다');
      }
    };

    const handleInitialized = ({ platform }: { platform: string }) => {
      console.log(`[${platform.toUpperCase()}] Initialized`);
      addSystemMessage(platform as Platform, '🚀 초기화가 완료되었습니다');
    };

    polyChat.on('message', handleMessage);
    polyChat.on('error', handleError);
    polyChat.on('connected', handleConnected);
    polyChat.on('disconnected', handleDisconnected);
    polyChat.on('auth', handleAuth);
    polyChat.on('initialized', handleInitialized);

    return () => {
      polyChat.off('message', handleMessage);
      polyChat.off('error', handleError);
      polyChat.off('connected', handleConnected);
      polyChat.off('disconnected', handleDisconnected);
      polyChat.off('auth', handleAuth);
      polyChat.off('initialized', handleInitialized);
    };
  }, [polyChat]);

  const addSystemMessage = (platform: Platform, content: string) => {
    setMessages((prev) => [...prev, {
      platform,
      type: 'system',
      nickname: 'SYSTEM',
      content,
      timestamp: new Date(),
    }]);
  };

  // Platform configurations
  const [configs, setConfigs] = useState<Record<Platform, PlatformConfig>>({
    chzzk: {
      clientId: '',
      redirectUri: `${window.location.origin}/callback`,
    },
    soop: {
      clientId: import.meta.env.VITE_SOOP_CLIENT_ID || '',
    },
    youtube: {
      clientId: import.meta.env.VITE_YOUTUBE_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/callback`,
    },
  });

  const [relayError, setRelayError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${RELAY_API_BASE_URL}/config`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Relay unavailable');
        return response.json();
      })
      .then(publicConfig => {
        if (controller.signal.aborted) return;
        setConfigs(current => {
          const next = { ...current };
          for (const platform of ['chzzk', 'soop', 'youtube'] as const) {
            const clientId = publicConfig[platform]?.clientId;
            if (!current[platform].clientId && typeof clientId === 'string') {
              next[platform] = { ...current[platform], clientId };
            }
          }
          return next;
        });
        setRelayError('');
      })
      .catch(() => {
        if (!controller.signal.aborted) setRelayError('연결 설정을 불러오지 못했습니다. 중계 서버가 실행 중인지 확인해주세요.');
      });
    return () => controller.abort();
  }, []);

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

  const updateConfig = (platform: Platform, key: keyof PlatformConfig, value: string | number) => {
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
      let adapter = polyChat.getAdapter(platform) as ChzzkAdapter | SoopAdapter | YouTubeAdapter | undefined;
      if (!adapter) {
        adapter = platform === 'chzzk' ? new ChzzkAdapter()
          : platform === 'soop' ? new SoopAdapter() : new YouTubeAdapter();
        polyChat.registerAdapter(adapter);
      }

      const initializingAdapter = adapter;
      setAdapters((prev) => new Map(prev).set(platform, {
        adapter: initializingAdapter,
        status: 'disconnected',
        error: '',
        isInitializing: true,
        config: { ...config },
      }));

      // Initialize - init now handles code internally
      if (platform === 'chzzk') {
        // CHZZK requires redirectUri
        if (!config.redirectUri) {
          throw new Error('redirectUri is required for CHZZK');
        }
        await (adapter as ChzzkAdapter).init({
          redirectUri: config.redirectUri,
          clientId: config.clientId,
          apiBaseUrl: CHZZK_API_BASE_URL,
        });
      } else if (platform === 'youtube') {
        // YouTube requires redirectUri
        if (!config.redirectUri) {
          throw new Error('redirectUri is required for YouTube');
        }
        await (adapter as YouTubeAdapter).init({
          clientId: config.clientId,
          redirectUri: config.redirectUri,
          streamUrl: YOUTUBE_STREAM_URL,
          apiBaseUrl: YOUTUBE_API_BASE_URL,
        });
      } else {
        // SOOP doesn't require redirectUri
        await (adapter as SoopAdapter).init({
          clientId: config.clientId,
          apiBaseUrl: SOOP_API_BASE_URL,
        });
      }

      updateAdapterState(platform, { status: 'initialized', error: '' });
    } catch (err: any) {
      updateAdapterState(platform, { error: err.message });
    } finally {
      updateAdapterState(platform, { isInitializing: false });
    }
  };

  const handleAuthenticate = async (platform: Platform) => {
    const adapterState = adapters.get(platform);
    if (!adapterState) return;

    try {
      const config = configs[platform];

      if (platform === 'chzzk') {
        await (adapterState.adapter as ChzzkAdapter).authenticate({});
      } else if (platform === 'soop') {
        await (adapterState.adapter as SoopAdapter).authenticate({
          clientId: config.clientId,
        });
      } else if (platform === 'youtube') {
        await (adapterState.adapter as YouTubeAdapter).authenticate({});
      }

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
    setIsTestMode(false);
    adapters.forEach((state) => {
      state.adapter.disconnect().catch(() => {});
    });
    setAdapters(new Map());
    setMessages([]);
    setIsConfigured(false);
  };

  const connectedCount = Array.from(adapters.values()).filter((state) => state.status === 'connected').length;
  const toggleTestMode = () => setIsTestMode((current) => !current);

  return (
    <DashboardShell
      configured={isConfigured}
      testMode={isTestMode}
      selectedCount={selectedPlatforms.size}
      connectedCount={connectedCount}
      messageCount={messages.length}
      isInitializing={Array.from(adapters.values()).some((state) => state.isInitializing)}
      onReset={handleReset}
      onToggleTest={toggleTestMode}
    >
      {isConfigured ? (
        <ChatView
          selectedPlatforms={selectedPlatforms}
          adapters={adapters}
          messages={messages}
          testMode={isTestMode}
          onInit={handleInit}
          onAuthenticate={handleAuthenticate}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onToggleTest={toggleTestMode}
        />
      ) : (
        <SetupView
          selectedPlatforms={selectedPlatforms}
          configs={configs}
          onToggle={togglePlatform}
          onUpdateConfig={updateConfig}
          onConfigure={handleConfigure}
          relayError={relayError}
        />
      )}
    </DashboardShell>
  );
}

export default App;
