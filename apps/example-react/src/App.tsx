import {useState} from 'react';
import './App.css';
import {ChzzkDemo} from "./components/ChzzkDemo.tsx";
import {SoopDemo} from "./components/SoopDemo.tsx";
import {YouTubeDemo} from "./components/YouTubeDemo.tsx";

type Platform = 'chzzk' | 'soop' | 'youtube' | null;

function App() {

    const [selectedPlatform, setSelectedPlatform] = useState<Platform>();


    return (
        <div className="app">
            <header className="app-header">
                <h1>PolyChat React Demo</h1>
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
                        <button
                            className="platform-button youtube"
                            onClick={() => setSelectedPlatform('youtube')}
                        >
                            <h3>YouTube</h3>
                            <p>유튜브 플랫폼 (OAuth 테스트)</p>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="demo-container">
                    <button className="reset-button" onClick={()=> setSelectedPlatform(null)}>
                        ← 플랫폼 다시 선택
                    </button>
                    {selectedPlatform === 'chzzk' && <ChzzkDemo/>}
                    {selectedPlatform === 'soop' && <SoopDemo/>}
                    {selectedPlatform === 'youtube' && <YouTubeDemo/>}
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
