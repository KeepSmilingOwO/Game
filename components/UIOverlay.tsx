import React from 'react';
import { GameStatus, GameState, DefectType } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  defectsLibrary: DefectType[];
  currentDefectInfo?: DefectType;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
}

export default function UIOverlay({ 
  gameState, 
  defectsLibrary, 
  currentDefectInfo, 
  onStart, 
  onResume, 
  onRestart 
}: UIOverlayProps) {
  
  // -- Status: IDLE (Start Screen) --
  if (gameState.status === GameStatus.IDLE) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 text-white">
        <h1 className="text-6xl font-bold mb-4 text-cyan-400 tracking-widest uppercase glow-text">
          Silicon Defender
        </h1>
        <h2 className="text-2xl mb-8 text-gray-300">Free-Roam Atomic Expedition</h2>
        
        <div className="max-w-md text-center mb-8 p-6 border border-cyan-500/30 bg-cyan-900/20 rounded-lg backdrop-blur-sm">
          <p className="mb-4">
            Shrink down to the nanometer scale! Freely explore the Silicon lattice structure.
          </p>
          <ul className="text-left text-sm space-y-2 mb-4 text-cyan-200">
            <li>• <b className="text-white">W, A, S, D</b> to Move.</li>
            <li>• <b className="text-white">Mouse</b> to Look.</li>
            <li>• <b className="text-white">Click</b> to shoot lasers.</li>
            <li>• Find and destroy <b className="text-red-400">Defects</b> hiding in the crystal.</li>
          </ul>
        </div>

        <button 
          onClick={onStart}
          className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
        >
          ENTER LATTICE
        </button>
      </div>
    );
  }

  // -- Status: LOADING --
  if (gameState.status === GameStatus.LOADING_DATA) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 text-white">
        <div className="w-16 h-16 border-4 border-t-cyan-500 border-r-transparent border-b-cyan-500 border-l-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-cyan-400 tracking-widest">GENERATING CRYSTAL STRUCTURE...</p>
        <p className="text-xs text-gray-500 mt-2">Populating lattice with Gemini data...</p>
      </div>
    );
  }

  // -- Status: PLAYING (HUD) --
  if (gameState.status === GameStatus.PLAYING) {
    return (
      <div className="absolute inset-0 pointer-events-none z-10 p-6 flex flex-col justify-between">
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-br-2xl border-l-4 border-cyan-500">
            <h3 className="text-cyan-400 text-xs uppercase tracking-widest mb-1">Suit Integrity</h3>
            <div className="w-48 h-4 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-300" 
                style={{ width: `${gameState.health}%` }}
              />
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-md p-4 rounded-bl-2xl border-r-4 border-purple-500 text-right">
            <h3 className="text-purple-400 text-xs uppercase tracking-widest mb-1">Defects Cleared</h3>
            <div className="text-4xl font-bold text-white font-mono">{gameState.score.toLocaleString()}</div>
          </div>
        </div>

        {/* Crosshair */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50">
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="2" fill="cyan" />
            <circle cx="20" cy="20" r="18" stroke="cyan" strokeWidth="1" fill="none" opacity="0.5" />
            <line x1="15" y1="20" x2="5" y2="20" stroke="cyan" strokeWidth="1" />
            <line x1="25" y1="20" x2="35" y2="20" stroke="cyan" strokeWidth="1" />
            <line x1="20" y1="15" x2="20" y2="5" stroke="cyan" strokeWidth="1" />
            <line x1="20" y1="25" x2="20" y2="35" stroke="cyan" strokeWidth="1" />
          </svg>
        </div>

        {/* Bottom Hint */}
        <div className="text-center bg-black/20 p-2 rounded backdrop-blur">
            <p className="text-cyan-500/80 text-xs uppercase font-bold">WASD to Move | Mouse to Aim | Click to Shoot</p>
        </div>
      </div>
    );
  }

  // -- Status: PAUSED_INFO (Educational Modal) --
  if (gameState.status === GameStatus.PAUSED_INFO && currentDefectInfo) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50 text-white p-4">
        <div className="max-w-2xl w-full bg-gray-900 border border-cyan-500/50 rounded-xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300">
          
          <div className="h-2 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
          
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white uppercase flex items-center gap-3">
                    <span className="w-3 h-8 bg-cyan-500 block"></span>
                    Defect Analyzed
                </h2>
                <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-inner"
                    style={{ backgroundColor: currentDefectInfo.color, color: 'black' }}
                >
                    !
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <h3 className="text-cyan-400 text-sm font-bold uppercase tracking-wider mb-1">Classification</h3>
                    <p className="text-2xl font-light">{currentDefectInfo.name}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/30 p-4 rounded-lg border border-white/10">
                        <h4 className="text-gray-400 text-xs uppercase mb-2">Visual ID</h4>
                        <p className="text-gray-200 leading-relaxed">{currentDefectInfo.description}</p>
                    </div>
                    <div className="bg-cyan-900/10 p-4 rounded-lg border border-cyan-500/20">
                        <h4 className="text-cyan-400 text-xs uppercase mb-2">Scientific Data</h4>
                        <p className="text-cyan-100 text-sm leading-relaxed italic">
                            "{currentDefectInfo.scientificDetails}"
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button 
                    onClick={onResume}
                    className="px-6 py-2 bg-white text-black font-bold hover:bg-cyan-400 hover:text-white transition-colors uppercase tracking-widest text-sm rounded"
                >
                    Resume Exploration
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- Status: GAME_OVER --
  if (gameState.status === GameStatus.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-md z-50 text-white">
        <h1 className="text-6xl font-bold mb-2 text-white uppercase">Suit Breach</h1>
        <p className="text-red-200 text-xl mb-8">Too many collisions with atomic structures.</p>
        
        <div className="bg-black/50 p-8 rounded-xl border border-red-500/30 text-center mb-8">
            <p className="text-sm text-gray-400 uppercase tracking-widest mb-2">Research Score</p>
            <p className="text-5xl font-mono font-bold text-cyan-400">{gameState.score.toLocaleString()}</p>
        </div>

        <button 
          onClick={onRestart}
          className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-all shadow-lg"
        >
          REBOOT SYSTEM
        </button>
      </div>
    );
  }

  return null;
}