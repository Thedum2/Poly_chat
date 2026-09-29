import type { Platform, PlatformConfig } from '../types';
import { Icon, PLATFORMS, PLATFORM_INFO, PlatformMark } from './ui';

interface Props {
  selectedPlatforms: Set<Platform>;
  configs: Record<Platform, PlatformConfig>;
  onToggle: (platform: Platform) => void;
  onUpdateConfig: (platform: Platform, key: keyof PlatformConfig, value: string | number) => void;
  onConfigure: () => void;
}

export default function SetupView({
  selectedPlatforms,
  configs,
  onToggle,
  onUpdateConfig,
  onConfigure,
}: Props) {
  return (
    <div className="setup-layout">
      <div className="setup-main">
        <section className="panel platform-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">STEP 01</span>
              <h2>어디에서 방송하시나요?</h2>
              <p>연결할 플랫폼을 선택해 주세요. 여러 개를 선택할 수 있어요.</p>
            </div>
            <span className="selection-count">{selectedPlatforms.size}개 선택</span>
          </div>
          <div className="platform-grid">
            {PLATFORMS.map((platform) => (
              <label
                className={`platform-option ${selectedPlatforms.has(platform) ? 'selected' : ''}`}
                key={platform}
              >
                <input
                  type="checkbox"
                  aria-label={PLATFORM_INFO[platform].name}
                  checked={selectedPlatforms.has(platform)}
                  onChange={() => onToggle(platform)}
                />
                <span className="selection-check">
                  <Icon name="check" size={12} />
                </span>
                <PlatformMark platform={platform} />
                <strong>{PLATFORM_INFO[platform].name}</strong>
                <span className="platform-description">{PLATFORM_INFO[platform].description}</span>
                <span className={`platform-method ${platform}`}>
                  <span className="status-dot" />
                  {PLATFORM_INFO[platform].method}
                </span>
              </label>
            ))}
          </div>
          <div className="platform-section-footer">
            <Icon name="shield" size={15} />
            <span>연결할 플랫폼은 언제든 다시 설정할 수 있어요.</span>
          </div>
        </section>

        <section className="panel configuration-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">STEP 02</span>
              <h2>연결 정보를 입력해 주세요</h2>
              <p>각 플랫폼에서 발급받은 정보를 입력하면 준비가 끝나요.</p>
            </div>
            <span className="step-icon">
              <Icon name="plug" size={21} />
            </span>
          </div>
          {selectedPlatforms.size === 0 ? (
            <div className="configuration-empty">
              <span className="empty-plug">
                <Icon name="plug" size={24} />
              </span>
              <strong>어떤 플랫폼과 함께할까요?</strong>
              <p>위에서 플랫폼을 선택하면 연결 설정이 나타나요.</p>
            </div>
          ) : (
            <div className="config-list">
              {PLATFORMS.filter((platform) => selectedPlatforms.has(platform)).map((platform) => (
                <div className="platform-config" key={platform}>
                  <div className="config-platform-title">
                    <PlatformMark platform={platform} small />
                    <h3>{PLATFORM_INFO[platform].name}</h3>
                    <span>연결 설정</span>
                  </div>
                  <div className="config-fields">
                    {platform !== 'chzzk' && <div className="form-field">
                      <label htmlFor={`${platform}-client-id`}>Client ID</label>
                      <input
                        id={`${platform}-client-id`}
                        type="text"
                        value={configs[platform].clientId}
                        onChange={(e) => onUpdateConfig(platform, 'clientId', e.target.value)}
                        placeholder="발급받은 Client ID"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>}
                    {platform === 'soop' && (
                      <div className="form-field">
                        <label htmlFor={`${platform}-client-secret`}>Client Secret</label>
                        <input
                          id={`${platform}-client-secret`}
                          type="password"
                          value={configs[platform].clientSecret}
                          onChange={(e) => onUpdateConfig(platform, 'clientSecret', e.target.value)}
                          placeholder="발급받은 Client Secret"
                          autoComplete="off"
                        />
                      </div>
                    )}
                    {platform !== 'soop' && (
                      <div className={`form-field ${platform === 'chzzk' ? 'full-width' : ''}`}>
                        <label htmlFor={`${platform}-redirect`}>Redirect URI</label>
                        <input
                          id={`${platform}-redirect`}
                          type="url"
                          value={configs[platform].redirectUri || ''}
                          onChange={(e) => onUpdateConfig(platform, 'redirectUri', e.target.value)}
                          placeholder="http://localhost:3000/callback"
                          spellCheck={false}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="configuration-footer">
            <span>
              {selectedPlatforms.size
                ? `${selectedPlatforms.size}개 플랫폼과 연결할 준비가 되었나요?`
                : '먼저 플랫폼을 선택해 주세요'}
            </span>
            <button
              className="button button-primary"
              onClick={onConfigure}
              disabled={selectedPlatforms.size === 0}
            >
              채팅 콘솔 열기
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </section>
      </div>

      <a
        className="setup-help"
        href="https://github.com/Thedum2/Poly_chat#환경-설정"
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="book" size={17} />
        <span>연결 정보는 어디서 발급받나요?</span>
        <Icon name="external" size={14} />
      </a>
    </div>
  );
}
