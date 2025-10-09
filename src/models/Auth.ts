export interface InitOptions{

}

export interface ChzzkInitOptions extends InitOptions{
    clientId: string;
    redirectUri: string;
}

export interface SoopInitOptions extends InitOptions{
    clientId: string;
    clientSecret: string;
}

export interface YouTubeInitOptions extends InitOptions{

}
export interface AuthOptions {

}

export interface YouTubeAuthOptions extends AuthOptions {
    //TODO: 추가 예정
}

export interface ChzzkAuthOptions extends AuthOptions {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
    state: string;
}

export interface SoopAuthOptions extends AuthOptions {
    clientId: string;
    clientSecret: string;
    code: string;
}
