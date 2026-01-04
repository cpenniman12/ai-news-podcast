'use client';

import { useState, useEffect, useCallback } from 'react';
import { type User } from '@supabase/supabase-js';
import { HeadlineSelector } from '@/components/HeadlineSelector';
import { PodcastGenerator } from '@/components/PodcastGenerator';
import { AudioPlayer } from '@/components/AudioPlayer';

interface HomeClientProps {
  initialHeadlines: string[];
  isInitiallyLoading: boolean;
}

export default function HomeClient({ 
  initialHeadlines, 
  isInitiallyLoading 
}: HomeClientProps) {
  const [user] = useState<User | null>({ id: 'demo-user', email: 'demo@localhost' } as User);
  const [selectedHeadlines, setSelectedHeadlines] = useState<string[]>([]);
  const [podcastUrl, setPodcastUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [headlines, setHeadlines] = useState<string[]>(initialHeadlines);
  const [isPolling, setIsPolling] = useState(isInitiallyLoading);

  // Poll for headlines if still loading on initial render
  const pollForHeadlines = useCallback(async () => {
    try {
      const response = await fetch('/api/headlines');
      const data = await response.json();
      
      if (data.headlines && data.headlines.length > 0 && !data.isLoading) {
        // Filter out placeholder headlines
        const realHeadlines = data.headlines.filter(
          (h: string) => !h.includes('AI News Loading')
        );
        if (realHeadlines.length > 0) {
          setHeadlines(realHeadlines);
          setIsPolling(false);
          console.log('✅ Headlines loaded via polling:', realHeadlines.length);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Polling error:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isPolling) return;

    console.log('🔄 Starting headline polling...');
    
    const poll = async () => {
      const success = await pollForHeadlines();
      if (!success) {
        // Retry in 2 seconds
        setTimeout(poll, 2000);
      }
    };

    // Start polling after a short delay
    const timeout = setTimeout(poll, 1000);
    
    return () => clearTimeout(timeout);
  }, [isPolling, pollForHeadlines]);

  // Update headlines if they change from parent (shouldn't happen in practice)
  useEffect(() => {
    if (initialHeadlines.length > 0 && !initialHeadlines[0]?.includes('AI News Loading')) {
      setHeadlines(initialHeadlines);
      setIsPolling(false);
    }
  }, [initialHeadlines]);

  const resetPodcast = () => {
    if (podcastUrl && podcastUrl.startsWith('blob:')) {
      URL.revokeObjectURL(podcastUrl);
      console.log('🗑️ Cleaned up podcast blob URL');
    }
    setPodcastUrl(null);
    setSelectedHeadlines([]);
    setIsGenerating(false);
  };

  // Only show loading if we're polling AND have no real headlines
  const hasRealHeadlines = headlines.length > 0 && !headlines[0]?.includes('AI News Loading');
  const showLoading = isPolling && !hasRealHeadlines;

  if (showLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-white mb-3">Loading Latest AI News</h2>
          <p className="text-gray-300 mb-2">
            Preparing your personalized headlines...
          </p>
          <p className="text-sm text-gray-400">
            This should only take a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="px-5 py-6 md:px-10 md:py-10 md:pb-8">
        <div className="max-w-[680px] mx-auto">
          <h1 className="text-[1.75rem] md:text-4xl font-semibold tracking-tight mb-2 md:mb-3">
            The latest AI news, by AI
          </h1>
          <p className="text-base md:text-lg text-white text-opacity-60 font-normal">
            curate, generate, listen
          </p>
          
          {user && (
            <div className="mt-4 flex items-center justify-center space-x-4">
              <span className="text-sm text-gray-400">
                Demo Mode
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-[100px]">
        {podcastUrl ? (
          <AudioPlayer 
            audioUrl={podcastUrl} 
            onBack={resetPodcast}
            selectedCount={selectedHeadlines.length}
          />
        ) : (
          <div className="max-w-[680px] mx-auto px-5 py-8 md:px-10 md:py-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-white text-opacity-50">
                Today&apos;s Headlines
              </h2>
              <span className="text-sm text-white text-opacity-40">
                {headlines.length} stories
              </span>
            </div>
            
            <HeadlineSelector
              headlines={headlines}
              selectedHeadlines={selectedHeadlines}
              onSelectionChange={setSelectedHeadlines}
            />
          </div>
        )}
      </main>

      {/* Fixed Bottom Actions */}
      {!podcastUrl && (
        <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 backdrop-blur-[20px] p-5 md:p-6 z-[1000]">
          <div className="max-w-[680px] mx-auto flex justify-center">
            <PodcastGenerator
              selectedHeadlines={selectedHeadlines}
              onGenerate={() => setIsGenerating(true)}
              onComplete={(url: string) => {
                setPodcastUrl(url);
                setIsGenerating(false);
              }}
              isGenerating={isGenerating}
            />
          </div>
        </div>
      )}
    </div>
  );
}

