import { EventEmitter } from 'events';
import { IChatAdapter } from '../../ports/IChatAdapter';
import { AuthOptions, SoopAuthOptions } from '../../models/Auth';
import { soopAuthStore } from '../../store/soopAuthStore';

export class SoopAdapter extends EventEmitter implements IChatAdapter {
  readonly platform = 'soop';
  private _isAuthenticated = false;
  private _isConnected = false;

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async init(): Promise<void> {

  }
  async authenticate(options: SoopAuthOptions): Promise<void> {
    // TODO: Soop 인증 로직 구현 필요
    console.log('SoopAdapter authenticated');
  }

  async connect(): Promise<void> {
    this._isConnected = true;
    console.log(`SoopAdapter connected to channel`);
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
    console.log('SoopAdapter disconnected');
  }

  async logout(): Promise<void> {
    soopAuthStore.getState().clearTokens();
    this._isAuthenticated = false;
    console.log('SoopAdapter logged out.');
  }
}
