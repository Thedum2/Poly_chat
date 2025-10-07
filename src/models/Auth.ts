export interface AuthOptions {
  [key: string]: any;
}

export interface YouTubeAuthOptions extends AuthOptions {
    //TODO: 추가 예정

}

export interface ChzzkAuthOptions extends AuthOptions {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    state: string;
    code: string;
}

export interface SoopAuthOptions extends AuthOptions {
    //TODO: 추가 예정

}
