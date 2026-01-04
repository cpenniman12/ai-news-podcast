'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  onBack: () => void;
  selectedCount: number;
}

export function AudioPlayer({ audioUrl, onBack, selectedCount }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(3600); // 1 hour in seconds

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

    // Countdown timer for 1-hour availability
    const countdownInterval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

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
      clearInterval(countdownInterval);
      
      // Don't clean up blob URL here - it may still be needed if component remounts
      // The cleanup should happen when going back to headlines
    };
  }, [audioUrl]);

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

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-lg shadow-md overflow-hidden border border-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Stories</span>
          </button>
          
          <div className="text-right text-sm">
            <div className="text-white/90">Expires in</div>
            <div className="font-bold">{formatTimeRemaining(timeRemaining)}</div>
          </div>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold mb-2">Your AI News Podcast</h1>
          <p className="text-white/90">
            {selectedCount} stories • AI-generated just for you
          </p>
        </div>
      </div>

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

        {/* Info Cards */}
        <div className="space-y-4">
          {/* Availability Notice */}
          <div className="bg-amber-900 bg-opacity-30 border border-amber-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-amber-300 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Temporary Availability</span>
            </div>
            <p className="text-sm text-amber-300">
              Your podcast will be automatically deleted in {formatTimeRemaining(timeRemaining)}. 
              Listen now or bookmark this page to access it later.
            </p>
          </div>


        </div>
      </div>
    </div>
  );
}
