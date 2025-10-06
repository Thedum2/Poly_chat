export interface AuthOptions {
  [key: string]: any;
}

export interface YouTubeAuthOptions extends AuthOptions {
  apiKey: string;
}

export interface ChzzkAuthOptions extends AuthOptions {
  nidAuth: string;
  nidSes: string;
}

export interface SoopAuthOptions extends AuthOptions {
  apiKey: string;
  userId: string;
}
