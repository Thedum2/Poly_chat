/**
 * 테스트 시뮬레이터 사용 예제
 *
 * 이 파일은 TestSimulator를 사용하는 방법을 보여줍니다.
 */

import { useState, useEffect } from 'react';
import { TestSimulator, SimulatedMessage } from './test-simulator';

/**
 * 예제 1: 기본 사용법
 */
export function Example1_BasicUsage() {
  const [messages, setMessages] = useState<SimulatedMessage[]>([]);
  const [simulator] = useState(() => new TestSimulator());

  useEffect(() => {
    // 메시지 수신 리스너 등록
    const handleMessage = (message: SimulatedMessage) => {
      setMessages((prev) => [...prev, message]);
      console.log('새 메시지:', message);
    };

    simulator.onMessage(handleMessage);

    // 컴포넌트 언마운트 시 정리
    return () => {
      simulator.offMessage(handleMessage);
      simulator.stop();
    };
  }, [simulator]);

  return (
    <div>
      <h2>테스트 시뮬레이터 예제</h2>
      <div>
        <button onClick={() => simulator.start(50)}>
          50개 메시지 생성 시작
        </button>
        <button onClick={() => simulator.stop()}>
          중지
        </button>
        <button onClick={() => setMessages([])}>
          메시지 초기화
        </button>
      </div>
      <div>
        <p>생성된 메시지 수: {messages.length}</p>
        <p>시뮬레이터 실행 중: {simulator.isRunning() ? '예' : '아니오'}</p>
      </div>
    </div>
  );
}

/**
 * 예제 2: 배치 메시지 생성
 */
export function Example2_BatchMessages() {
  const [messages, setMessages] = useState<SimulatedMessage[]>([]);
  const [simulator] = useState(() => new TestSimulator());

  useEffect(() => {
    simulator.onMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      simulator.reset();
    };
  }, [simulator]);

  const handleBatchGenerate = (count: number) => {
    const newMessages = simulator.sendBatch(count);
    console.log(`${count}개의 메시지를 즉시 생성했습니다:`, newMessages);
  };

  return (
    <div>
      <h2>배치 메시지 생성 예제</h2>
      <div>
        <button onClick={() => handleBatchGenerate(10)}>
          10개 즉시 생성
        </button>
        <button onClick={() => handleBatchGenerate(50)}>
          50개 즉시 생성
        </button>
        <button onClick={() => handleBatchGenerate(100)}>
          100개 즉시 생성
        </button>
      </div>
      <p>생성된 메시지 수: {messages.length}</p>
    </div>
  );
}

/**
 * 예제 3: 플랫폼별 메시지 필터링
 */
export function Example3_PlatformFilter() {
  const [messages, setMessages] = useState<SimulatedMessage[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'chzzk' | 'soop' | 'youtube'>('all');
  const [simulator] = useState(() => new TestSimulator());

  useEffect(() => {
    simulator.onMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    // 자동으로 시작
    simulator.start(100);

    return () => {
      simulator.stop();
    };
  }, [simulator]);

  const filteredMessages =
    selectedPlatform === 'all'
      ? messages
      : messages.filter((msg) => msg.platform === selectedPlatform);

  return (
    <div>
      <h2>플랫폼별 필터링 예제</h2>
      <div>
        <label>
          <input
            type="radio"
            checked={selectedPlatform === 'all'}
            onChange={() => setSelectedPlatform('all')}
          />
          전체
        </label>
        <label>
          <input
            type="radio"
            checked={selectedPlatform === 'chzzk'}
            onChange={() => setSelectedPlatform('chzzk')}
          />
          CHZZK
        </label>
        <label>
          <input
            type="radio"
            checked={selectedPlatform === 'soop'}
            onChange={() => setSelectedPlatform('soop')}
          />
          SOOP
        </label>
        <label>
          <input
            type="radio"
            checked={selectedPlatform === 'youtube'}
            onChange={() => setSelectedPlatform('youtube')}
          />
          YouTube
        </label>
      </div>
      <div>
        <p>전체 메시지: {messages.length}</p>
        <p>필터된 메시지: {filteredMessages.length}</p>
      </div>
      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
        {filteredMessages.map((msg, idx) => (
          <div key={idx}>
            [{msg.platform}] {msg.nickname}: {msg.content}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 예제 4: Node.js 환경에서 사용 (순수 TypeScript)
 */
export async function Example4_NodeJS() {
  const simulator = new TestSimulator();

  // Promise로 메시지 대기
  const waitForMessages = (count: number): Promise<SimulatedMessage[]> => {
    return new Promise((resolve) => {
      const messages: SimulatedMessage[] = [];
      const handler = (message: SimulatedMessage) => {
        messages.push(message);
        if (messages.length >= count) {
          simulator.offMessage(handler);
          simulator.stop();
          resolve(messages);
        }
      };
      simulator.onMessage(handler);
      simulator.start(count);
    });
  };

  console.log('10개의 메시지를 기다리는 중...');
  const messages = await waitForMessages(10);
  console.log('수신한 메시지:', messages);
  console.log('완료!');
}

/**
 * 예제 5: 여러 시뮬레이터 동시 실행
 */
export function Example5_MultipleSimulators() {
  const [chzzkMessages, setChzzkMessages] = useState<SimulatedMessage[]>([]);
  const [soopMessages, setSoopMessages] = useState<SimulatedMessage[]>([]);
  const [youtubeMessages, setYoutubeMessages] = useState<SimulatedMessage[]>([]);

  useEffect(() => {
    const chzzkSim = new TestSimulator();
    const soopSim = new TestSimulator();
    const youtubeSim = new TestSimulator();

    // 각 플랫폼별 메시지만 처리
    chzzkSim.onMessage((msg) => {
      if (msg.platform === 'chzzk') {
        setChzzkMessages((prev) => [...prev, msg]);
      }
    });

    soopSim.onMessage((msg) => {
      if (msg.platform === 'soop') {
        setSoopMessages((prev) => [...prev, msg]);
      }
    });

    youtubeSim.onMessage((msg) => {
      if (msg.platform === 'youtube') {
        setYoutubeMessages((prev) => [...prev, msg]);
      }
    });

    // 모두 시작
    chzzkSim.start();
    soopSim.start();
    youtubeSim.start();

    return () => {
      chzzkSim.stop();
      soopSim.stop();
      youtubeSim.stop();
    };
  }, []);

  return (
    <div>
      <h2>여러 시뮬레이터 동시 실행</h2>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div>
          <h3>CHZZK</h3>
          <p>{chzzkMessages.length} 메시지</p>
        </div>
        <div>
          <h3>SOOP</h3>
          <p>{soopMessages.length} 메시지</p>
        </div>
        <div>
          <h3>YouTube</h3>
          <p>{youtubeMessages.length} 메시지</p>
        </div>
      </div>
    </div>
  );
}
