import { BrandMark, Icon } from './ui';

export default function OAuthCallback() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const error = fragment.get('error') || query.get('error');
  const hasResponse = Boolean(fragment.get('access_token') || query.get('code') || error);
  const hasOpener = Boolean(window.opener);

  return (
    <main className="callback-page">
      <section className="panel callback-card" aria-labelledby="callback-title">
        <div className="brand">
          <BrandMark />
          <span>polychat.</span>
        </div>
        <div className="callback-icon">
          <Icon name={error ? 'reset' : 'shield'} size={30} />
        </div>
        <h1 id="callback-title">
          {error
            ? '로그인을 완료하지 못했어요'
            : hasOpener && hasResponse
              ? '로그인 결과를 확인하고 있어요'
              : '원래 페이지에서 로그인을 시작해 주세요'}
        </h1>
        <p>
          {error === 'access_denied'
            ? '로그인이 취소되었거나 필요한 권한이 허용되지 않았습니다.'
            : error
              ? '인증 요청에 실패했습니다. 원래 페이지에서 오류 내용을 확인해 주세요.'
              : hasOpener && hasResponse
                ? '결과가 전달되면 이 창이 자동으로 닫힙니다. 원래 페이지에서 다음 단계를 진행해 주세요.'
                : '이 주소는 로그인 결과를 받는 콜백 페이지입니다. PolyChat에서 플랫폼을 선택하고 초기화를 눌러 주세요.'}
        </p>
        {hasOpener ? (
          <>
            <button className="button button-primary" onClick={() => window.opener?.focus()}>
              원래 창으로 이동
              <Icon name="arrow" size={16} />
            </button>
            <p className="callback-help">
              창이 계속 남아 있다면 로그인한 탭이 열려 있는지, 콜백 주소의 도메인과 포트가 그 탭과
              같은지 확인해 주세요.
            </p>
          </>
        ) : (
          <a className="button button-primary" href="/">
            PolyChat으로 이동
            <Icon name="arrow" size={16} />
          </a>
        )}
      </section>
    </main>
  );
}
