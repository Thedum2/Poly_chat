export interface InitOptions{}

export interface ChzzkInitOptions extends InitOptions{
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export interface SoopInitOptions extends InitOptions{
    clientId: string;
    clientSecret: string;
}

export interface YouTubeInitOptions extends InitOptions{
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}
export interface AuthOptions {}

export interface YouTubeAuthOptions extends AuthOptions {
}

export interface ChzzkAuthOptions extends AuthOptions {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    state: string;
}

export interface SoopAuthOptions extends AuthOptions {
    clientId: string;
    clientSecret: string;
}
