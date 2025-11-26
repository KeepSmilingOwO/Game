import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas from './components/GameScene';
import UIOverlay from './components/UIOverlay';
import { GameState, GameStatus, DefectType } from './types';
import { fetchDefectData } from './services/geminiService';

const INITIAL_STATE: GameState = {
  score: 0,
  health: 100,
  status: GameStatus.IDLE,
  wave: 1,
  discoveredDefects: []
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [defectsLibrary, setDefectsLibrary] = useState<DefectType[]>([]);
  const [currentDefectInfo, setCurrentDefectInfo] = useState<DefectType | undefined>(undefined);

  // Load data on start
  const handleStartGame = async () => {
    setGameState(prev => ({ ...prev, status: GameStatus.LOADING_DATA }));
    
    // Fetch educational content
    const defects = await fetchDefectData();
    setDefectsLibrary(defects);
    
    // Slight delay for effect
    setTimeout(() => {
      setGameState(prev => ({ ...prev, status: GameStatus.PLAYING, health: 100, score: 0, discoveredDefects: [] }));
    }, 1500);
  };

  const handleScore = useCallback((amount: number, defectId: string) => {
    setGameState(prev => {
      // Check if this is a new discovery
      const isNewDiscovery = !prev.discoveredDefects.includes(defectId);
      let nextStatus = prev.status;
      
      if (isNewDiscovery) {
        // Find defect info
        const defect = defectsLibrary.find(d => d.id === defectId);
        if (defect) {
            setCurrentDefectInfo(defect);
            nextStatus = GameStatus.PAUSED_INFO; // Pause game to show info
        }
      }

      return {
        ...prev,
        score: prev.score + amount,
        discoveredDefects: isNewDiscovery ? [...prev.discoveredDefects, defectId] : prev.discoveredDefects,
        status: nextStatus
      };
    });
  }, [defectsLibrary]);

  const handleHit = useCallback(() => {
    setGameState(prev => {
      const newHealth = prev.health - 10;
      if (newHealth <= 0) {
        return { ...prev, health: 0, status: GameStatus.GAME_OVER };
      }
      return { ...prev, health: newHealth };
    });
  }, []);

  const handleResume = () => {
    setGameState(prev => ({ ...prev, status: GameStatus.PLAYING }));
    setCurrentDefectInfo(undefined);
  };

  const handleRestart = () => {
    setGameState({
        ...INITIAL_STATE,
        status: GameStatus.PLAYING
    });
    // We keep the defects library loaded
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden select-none">
      {/* 3D Scene Background */}
      <GameCanvas 
        status={gameState.status} 
        currentScore={gameState.score}
        defectsLibrary={defectsLibrary}
        onScore={handleScore}
        onHit={handleHit}
      />

      {/* 2D UI Overlay */}
      <UIOverlay 
        gameState={gameState}
        defectsLibrary={defectsLibrary}
        currentDefectInfo={currentDefectInfo}
        onStart={handleStartGame}
        onResume={handleResume}
        onRestart={handleRestart}
      />
    </div>
  );
}