'use client';

import { useState, useRef, useEffect } from 'react';
import type { DailyEpisode } from '@/utils/supabase/storage';

interface DailyStoriesProps {
  episode: DailyEpisode;
  onBack?: () => void;
}

interface StoryPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
}

export function DailyStories({ episode, onBack }: DailyStoriesProps) {
  const [activeStory, setActiveStory] = useState<1 | 2>(1);
  const [story1State, setStory1State] = useState<StoryPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false
  });
  const [story2State, setStory2State] = useState<StoryPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false
  });

  const audio1Ref = useRef<HTMLAudioElement>(null);
  const audio2Ref = useRef<HTMLAudioElement>(null);

  // Helper function to get current story state and audio ref
  const getCurrentStoryData = () => {
    if (activeStory === 1) {
      return {
        state: story1State,
        setState: setStory1State,
        audioRef: audio1Ref,
        title: episode.story_1_title,
        audioUrl: episode.story_1_audio_url,
        script: episode.story_1_script,
        duration: episode.story_1_duration_seconds
      };
    } else {
      return {
        state: story2State,
        setState: setStory2State,
        audioRef: audio2Ref,
        title: episode.story_2_title,
        audioUrl: episode.story_2_audio_url,
        script: episode.story_2_script,
        duration: episode.story_2_duration_seconds
      };
    }
  };

  const { state: currentState, setState: setCurrentState, audioRef: currentAudioRef, title, audioUrl, script, duration } = getCurrentStoryData();

  // Load audio metadata when component mounts or story changes
  useEffect(() => {
    const loadAudioMetadata = () => {
      if (currentAudioRef.current && audioUrl) {
        const audio = currentAudioRef.current;
        
        const handleLoadedMetadata = () => {
          setCurrentState(prev => ({
            ...prev,
            duration: audio.duration,
            isLoading: false
          }));
        };

        const handleTimeUpdate = () => {
          setCurrentState(prev => ({
            ...prev,
            currentTime: audio.currentTime
          }));
        };

        const handlePlay = () => {
          setCurrentState(prev => ({ ...prev, isPlaying: true }));
        };

        const handlePause = () => {
          setCurrentState(prev => ({ ...prev, isPlaying: false }));
        };

        const handleEnded = () => {
          setCurrentState(prev => ({
            ...prev,
            isPlaying: false,
            currentTime: 0
          }));
          audio.currentTime = 0;
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);

        // Load the audio
        audio.load();

        return () => {
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('play', handlePlay);
          audio.removeEventListener('pause', handlePause);
          audio.removeEventListener('ended', handleEnded);
        };
      }
    };

    loadAudioMetadata();
  }, [activeStory, audioUrl]);

  // Pause other story when switching
  useEffect(() => {
    if (activeStory === 1 && audio2Ref.current) {
      audio2Ref.current.pause();
      setStory2State(prev => ({ ...prev, isPlaying: false }));
    } else if (activeStory === 2 && audio1Ref.current) {
      audio1Ref.current.pause();
      setStory1State(prev => ({ ...prev, isPlaying: false }));
    }
  }, [activeStory]);

  const handlePlayPause = () => {
    if (!currentAudioRef.current || !audioUrl) return;

    const audio = currentAudioRef.current;
    
    if (currentState.isPlaying) {
      audio.pause();
    } else {
      setCurrentState(prev => ({ ...prev, isLoading: true }));
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        setCurrentState(prev => ({ ...prev, isLoading: false }));
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentAudioRef.current || !audioUrl) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * currentState.duration;
    
    currentAudioRef.current.currentTime = newTime;
    setCurrentState(prev => ({ ...prev, currentTime: newTime }));
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = currentState.duration > 0 ? (currentState.currentTime / currentState.duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hidden audio elements */}
      <audio ref={audio1Ref} preload="metadata">
        {episode.story_1_audio_url && <source src={episode.story_1_audio_url} type="audio/mpeg" />}
      </audio>
      <audio ref={audio2Ref} preload="metadata">
        {episode.story_2_audio_url && <source src={episode.story_2_audio_url} type="audio/mpeg" />}
      </audio>

      {/* Header */}
      <header className="px-5 py-6 md:px-10 md:py-8">
        <div className="max-w-[680px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[1.5rem] md:text-2xl font-semibold tracking-tight mb-1">
              Today's AI News
            </h1>
            <p className="text-sm text-white text-opacity-60">
              {new Date(episode.episode_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-white text-opacity-60 hover:text-opacity-100 transition-opacity"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Story Navigation */}
      <div className="px-5 md:px-10 mb-8">
        <div className="max-w-[680px] mx-auto">
          <div className="flex space-x-4 border-b border-white border-opacity-10">
            <button
              onClick={() => setActiveStory(1)}
              className={`pb-3 px-1 border-b-2 transition-colors text-sm font-medium ${
                activeStory === 1
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-white text-opacity-50 hover:text-opacity-75'
              }`}
            >
              Story 1
            </button>
            <button
              onClick={() => setActiveStory(2)}
              className={`pb-3 px-1 border-b-2 transition-colors text-sm font-medium ${
                activeStory === 2
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-white text-opacity-50 hover:text-opacity-75'
              }`}
            >
              Story 2
            </button>
          </div>
        </div>
      </div>

      {/* Current Story Content */}
      <main className="px-5 md:px-10 pb-32">
        <div className="max-w-[680px] mx-auto">
          {/* Story Title */}
          <h2 className="text-xl md:text-2xl font-semibold mb-6 leading-tight">
            {title}
          </h2>

          {/* Audio Player */}
          <div className="bg-white bg-opacity-5 rounded-xl p-6 mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={handlePlayPause}
                disabled={!audioUrl || currentState.isLoading}
                className="w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors"
              >
                {currentState.isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : currentState.isPlaying ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-white text-opacity-60 mb-1">
                  <span>{formatTime(currentState.currentTime)}</span>
                  <span>{formatTime(currentState.duration)}</span>
                </div>
                <div 
                  className="w-full h-2 bg-white bg-opacity-20 rounded-full cursor-pointer"
                  onClick={handleSeek}
                >
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-100"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {!audioUrl && (
              <p className="text-sm text-white text-opacity-50 text-center">
                Audio not available for this story
              </p>
            )}
          </div>

          {/* Story Script/Content */}
          <div className="prose prose-invert max-w-none">
            <div className="text-white text-opacity-80 leading-relaxed whitespace-pre-wrap">
              {script}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}"