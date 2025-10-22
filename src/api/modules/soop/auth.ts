export function buildSoopAuthUrl(clientId: string): string {
    return `https://openapi.sooplive.co.kr/auth/code?client_id=${clientId}`;
}