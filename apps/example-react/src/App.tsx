import { useState } from 'react';
import { ChzzkDemo } from './components/ChzzkDemo';
import { SoopDemo } from './components/SoopDemo';
import './App.css';

type Platform = 'chzzk' | 'soop' | null;

function App() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null);

  const handleReset = () => {
    setSelectedPlatform(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>PolyChat React 데모</h1>
        <p>다양한 플랫폼의 채팅을 하나의 인터페이스로 통합</p>
      </header>

      {!selectedPlatform ? (
        <div className="platform-selection">
          <h2>플랫폼을 선택하세요</h2>
          <div className="platform-buttons">
            <button
              className="platform-button chzzk"
              onClick={() => setSelectedPlatform('chzzk')}
            >
              <h3>CHZZK</h3>
              <p>네이버 치지직 플랫폼</p>
            </button>
            <button
              className="platform-button soop"
              onClick={() => setSelectedPlatform('soop')}
            >
              <h3>SOOP</h3>
              <p>숲 (구 아프리카TV) 플랫폼</p>
            </button>
          </div>
        </div>
      ) : (
        <div className="demo-container">
          <button className="reset-button" onClick={handleReset}>
            ← 플랫폼 다시 선택
          </button>
          {selectedPlatform === 'chzzk' && <ChzzkDemo />}
          {selectedPlatform === 'soop' && <SoopDemo />}
        </div>
      )}

      <footer className="app-footer">
        <p>
          Powered by <strong>PolyChat</strong> -
          <a href="https://github.com/Thedum2/Poly_chat" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
