export default function generateRandomKoreanWords(): string {
    const adjectives = ['빠른', '느린', '작은', '큰', '예쁜', '멋진', '귀여운', '시원한', '따뜻한', '차가운'];
    const nouns = ['고양이', '강아지', '토끼', '사자', '호랑이', '곰', '여우', '늑대', '팬더', '코알라'];
    const verbs = ['달리다', '뛰다', '걷다', '먹다', '자다', '놀다', '웃다', '울다', '노래하다', '춤추다'];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const verb = verbs[Math.floor(Math.random() * verbs.length)];

    const patterns = [
        `${adj} ${noun}`,
        `${noun}가 ${verb}`,
        `${adj} ${noun}가 ${verb}`,
        noun,
        `${noun} ${noun}`
    ];

    return patterns[Math.floor(Math.random() * patterns.length)];
}