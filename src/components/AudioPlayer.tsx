'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  onStoryEnd?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  currentStory?: number;
  totalStories?: number;
}

export function AudioPlayer({ 
  audioUrl, 
  onStoryEnd
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('🎵 AudioPlayer: Setting up audio with URL:', audioUrl?.substring(0, 50));

    const handleLoadedData = () => {
      console.log('✅ Audio loaded successfully, duration:', audio.duration);
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      console.log('✅ Audio can play, duration:', audio.duration);
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      console.log('📥 Audio load started');
    };

    const handleProgress = () => {
      const buffered = audio.buffered;
      if (buffered.length > 0) {
        console.log('📊 Audio buffering progress:', buffered.end(buffered.length - 1), 'seconds');
      }
    };

    const handleStalled = () => {
      console.warn('⚠️ Audio stalled - network may be slow or blob URL may be invalid');
    };

    const handleWaiting = () => {
      console.log('⏳ Audio waiting for more data...');
    };

    const handleError = (e: Event) => {
      const errorCode = audio.error?.code;
      const errorMessage = audio.error?.message || 'Unknown error';
      const errorCodeMap: Record<number, string> = {
        1: 'MEDIA_ERR_ABORTED - Fetching was aborted',
        2: 'MEDIA_ERR_NETWORK - Network error occurred',
        3: 'MEDIA_ERR_DECODE - Decoding error occurred',
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Source format not supported',
      };
      
      const errorDetails = {
        errorCode,
        errorType: errorCode ? errorCodeMap[errorCode] : 'No error code',
        errorMessage,
        networkState: audio.networkState,
        readyState: audio.readyState,
        src: audio.src?.substring(0, 100) + '...',
        currentTime: audio.currentTime,
        duration: audio.duration,
      };
      
      // Log as string to ensure it shows in console
      console.error('❌ Audio error event:', e.type);
      console.error('❌ Audio error details:', JSON.stringify(errorDetails, null, 2));
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      console.log('🏁 Audio playback ended');
      setIsPlaying(false);
      setCurrentTime(0);
      // Call onStoryEnd callback if provided
      if (onStoryEnd) {
        onStoryEnd();
      }
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Fallback timeout in case loading events don't fire
    const fallbackTimeout = setTimeout(() => {
      console.log('Audio loading timeout, assuming ready');
      setIsLoading(false);
    }, 5000);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      clearTimeout(fallbackTimeout);
    };
  }, [audioUrl, onStoryEnd]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (Number(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-lg shadow-md overflow-hidden border border-gray-800">

      {/* Player Controls */}
      <div className="p-6">
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />

        {isLoading ? (
          <div className="text-center py-8">
            <svg className="animate-spin w-8 h-8 text-blue-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-300">Loading your podcast...</p>
          </div>
        ) : (
          <>
            {/* Play/Pause Button */}
            <div className="flex items-center justify-center mb-6">
              <button
                onClick={togglePlayPause}
                className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
              >
                {isPlaying ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max="100"
                value={progressPercentage}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progressPercentage}%, #374151 ${progressPercentage}%, #374151 100%)`
                }}
              />
            </div>

            {/* Time Display */}
            <div className="flex justify-between text-sm text-gray-300 mb-6">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
