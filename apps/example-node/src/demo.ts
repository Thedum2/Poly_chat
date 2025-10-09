import * as readline from 'readline';
import { PolyChat, ChzzkAdapter, SoopAdapter } from 'polychat';
import type { ChatMessage } from 'polychat';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

async function main() {
    console.log('=================================');
    console.log('   PolyChat 테스트 애플리케이션   ');
    console.log('=================================\n');

    // 플랫폼 선택
    console.log('사용할 플랫폼을 선택하세요:');
    console.log('1. CHZZK');
    console.log('2. SOOP');
    const platformChoice = await question('\n선택 (1 또는 2): ');

    const polyChat = new PolyChat();

    // 메시지 이벤트 핸들러
    polyChat.on('message', (message: ChatMessage) => {
        console.log(`\n[${message.platform.toUpperCase()}] ${message.nickname}: ${message.content}`);
    });

    // 에러 이벤트 핸들러
    polyChat.on('error', (errorInfo: any) => {
        console.error(`\n[오류] ${errorInfo.platform}: ${errorInfo.error.message}`);
    });

    try {
        if (platformChoice === '1') {
            await runChzzkDemo(polyChat);
        } else if (platformChoice === '2') {
            await runSoopDemo(polyChat);
        } else {
            console.log('잘못된 선택입니다.');
            rl.close();
            return;
        }

        console.log('\n채팅 메시지 수신 중... (종료하려면 Ctrl+C를 누르세요)');
    } catch (error: any) {
        console.error('\n오류 발생:', error.message);
        rl.close();
        process.exit(1);
    }
}

async function runChzzkDemo(polyChat: PolyChat) {
    console.log('\n=== CHZZK 설정 ===');

    const clientId = await question('Client ID: ');
    const clientSecret = await question('Client Secret: ');
    const redirectUri = await question('Redirect URI: ');

    const chzzkAdapter = new ChzzkAdapter();
    polyChat.registerAdapter(chzzkAdapter);

    // 인증 URL 생성
    console.log('\n인증을 시작합니다...');
    const authUrl = await chzzkAdapter.init({
        clientId,
        redirectUri,
    });

    console.log('\n다음 URL로 접속하여 인증을 완료하세요:');
    console.log(authUrl);
    console.log('\n인증 완료 후 리다이렉트된 URL에서 code와 state 파라미터를 복사하세요.\n');

    const code = await question('Authorization Code: ');
    const state = await question('State: ');

    // 인증
    console.log('\n인증 처리 중...');
    await chzzkAdapter.authenticate({
        clientId,
        clientSecret,
        redirectUri,
        code,
        state,
    });

    console.log('인증 성공!');

    // 연결
    console.log('채팅 서버에 연결 중...');

    chzzkAdapter.on('connected', () => {
        console.log('CHZZK 채팅 서버에 연결되었습니다!');
    });

    chzzkAdapter.on('disconnected', () => {
        console.log('CHZZK 채팅 서버와의 연결이 끊어졌습니다.');
    });

    await chzzkAdapter.connect();
}

async function runSoopDemo(polyChat: PolyChat) {
    console.log('\n=== SOOP 설정 ===');
    console.log('주의: SOOP은 브라우저 환경에서만 완전히 작동합니다.');
    console.log('Node.js 환경에서는 제한적으로 동작할 수 있습니다.\n');

    const clientId = await question('Client ID: ');
    const clientSecret = await question('Client Secret: ');

    const soopAdapter = new SoopAdapter();
    polyChat.registerAdapter(soopAdapter);

    console.log('\n초기화 중...');
    console.log('SOOP SDK는 브라우저 환경이 필요하므로 다음 단계를 진행할 수 없습니다.');
    console.log('브라우저 환경에서 테스트해주세요.');

    rl.close();
    process.exit(0);
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n프로그램을 종료합니다...');
    rl.close();
    process.exit(0);
});

main().catch((error) => {
    console.error('예상치 못한 오류:', error);
    rl.close();
    process.exit(1);
});
