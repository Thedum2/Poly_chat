/**
 * 테스트 시뮬레이터 - 여러 플랫폼에서 메시지를 자동으로 생성
 *
 * 사용 방법:
 * ```typescript
 * import { TestSimulator } from './test-simulator';
 *
 * const simulator = new TestSimulator();
 *
 * // 메시지 수신 리스너 등록
 * simulator.onMessage((message) => {
 *   console.log('메시지 수신:', message);
 * });
 *
 * // 시뮬레이션 시작 (100개 메시지 생성)
 * simulator.start(100);
 *
 * // 시뮬레이션 중지
 * simulator.stop();
 * ```
 */

export type Platform = 'chzzk' | 'soop' | 'youtube';

export interface SimulatedMessage {
  platform: Platform;
  nickname: string;
  content: string;
  timestamp: Date;
  chat_id: string;
}

export type MessageCallback = (message: SimulatedMessage) => void;

export class TestSimulator {
  private callbacks: MessageCallback[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private messageCount = 0;
  private maxMessages = Infinity;

  private readonly platforms: Platform[] = ['chzzk', 'soop', 'youtube'];

  private readonly usernames = [
    '테스트유저1',
    '테스트유저2',
    '테스트유저3',
    '뷰어123',
    '시청자A',
    '팬B',
    '방문자C',
    '구독자D',
    '리스너E',
    '유저F',
  ];

  private readonly messageContents = [
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
    '오 신기하네요',
    '질문있어요!',
    '다음에 또 올게요',
    '재미있습니다 ㅎㅎ',
    '팬입니다!!',
    '응원합니다',
    '멋져요',
    '최고!!!',
    '와 진짜?',
    '좋은 정보 감사합니다',
  ];

  /**
   * 메시지 수신 리스너 등록
   */
  onMessage(callback: MessageCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 메시지 수신 리스너 제거
   */
  offMessage(callback: MessageCallback): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  /**
   * 랜덤 메시지 생성
   */
  private generateMessage(): SimulatedMessage {
    const platform = this.platforms[Math.floor(Math.random() * this.platforms.length)];
    const nickname = this.usernames[Math.floor(Math.random() * this.usernames.length)];
    const content = this.messageContents[Math.floor(Math.random() * this.messageContents.length)];
    const chat_id = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return {
      platform,
      nickname,
      content,
      timestamp: new Date(),
      chat_id,
    };
  }

  /**
   * 메시지를 모든 리스너에게 전달
   */
  private emitMessage(message: SimulatedMessage): void {
    this.callbacks.forEach((callback) => callback(message));
  }

  /**
   * 다음 메시지를 스케줄링
   */
  private scheduleNextMessage(): void {
    if (this.messageCount >= this.maxMessages) {
      this.stop();
      return;
    }

    // 500ms ~ 2000ms 사이의 랜덤 간격
    const delay = Math.random() * 1500 + 500;

    this.intervalId = setTimeout(() => {
      const message = this.generateMessage();
      this.emitMessage(message);
      this.messageCount++;
      this.scheduleNextMessage();
    }, delay);
  }

  /**
   * 시뮬레이션 시작
   * @param maxMessages 생성할 최대 메시지 수 (기본값: Infinity)
   */
  start(maxMessages: number = Infinity): void {
    if (this.intervalId) {
      console.warn('시뮬레이터가 이미 실행 중입니다.');
      return;
    }

    this.messageCount = 0;
    this.maxMessages = maxMessages;
    console.log(`시뮬레이션 시작 (최대 ${maxMessages === Infinity ? '무제한' : maxMessages}개 메시지)`);
    this.scheduleNextMessage();
  }

  /**
   * 시뮬레이션 중지
   */
  stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
      console.log(`시뮬레이션 중지 (${this.messageCount}개 메시지 생성됨)`);
    }
  }

  /**
   * 단일 메시지 즉시 생성 및 전송
   */
  sendOne(): SimulatedMessage {
    const message = this.generateMessage();
    this.emitMessage(message);
    return message;
  }

  /**
   * 여러 메시지를 배치로 즉시 생성 및 전송
   */
  sendBatch(count: number): SimulatedMessage[] {
    const messages: SimulatedMessage[] = [];
    for (let i = 0; i < count; i++) {
      messages.push(this.sendOne());
    }
    return messages;
  }

  /**
   * 시뮬레이터 상태 확인
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * 생성된 메시지 수 확인
   */
  getMessageCount(): number {
    return this.messageCount;
  }

  /**
   * 시뮬레이터 리셋
   */
  reset(): void {
    this.stop();
    this.messageCount = 0;
    this.callbacks = [];
  }
}

// 싱글톤 인스턴스 (선택 사항)
export const testSimulator = new TestSimulator();
