'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { type User } from '@supabase/supabase-js';
import { EmailVerification } from '@/components/EmailVerification';
import { HeadlineSelector } from '@/components/HeadlineSelector';
import { PodcastGenerator } from '@/components/PodcastGenerator';
import { AudioPlayer } from '@/components/AudioPlayer';
import { fetchTechNewsHeadlines } from '@/utils/headlines-client';

export default function Home() {
  const [user, setUser] = useState<User | null>({ id: 'demo-user', email: 'demo@localhost' } as any);
  const [selectedHeadlines, setSelectedHeadlines] = useState<string[]>([]);
  const [podcastUrl, setPodcastUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [headlines, setHeadlines] = useState<string[]>([]);

  const supabase = createClient();

  // Fetch headlines immediately on mount - no loading screen!
  useEffect(() => {
    console.log('🚀 Fetching headlines on mount...');
    fetchTechNewsHeadlines()
      .then(fetched => {
        console.log('✅ Headlines fetched successfully:', fetched.length, 'headlines');
        setHeadlines(fetched);
      })
      .catch(err => {
        console.error('❌ Error fetching headlines:', err);
        // Even on error, headlines-client should return fallback data
        // so we don't need special error handling here
      });
  }, []);

  // Reset selections when going back to headline selection
  const resetPodcast = () => {
    // Clean up blob URL to prevent memory leaks
    if (podcastUrl && podcastUrl.startsWith('blob:')) {
      URL.revokeObjectURL(podcastUrl);
      console.log('🗑️ Cleaned up podcast blob URL');
    }

    setPodcastUrl(null);
    setSelectedHeadlines([]);
    setIsGenerating(false);
  };

  // Main app interface - no loading screens!
  // Show immediately with whatever headlines we have (cached or fallback)
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
          
          {/* User info and sign out */}
          {user && (
            <div className="mt-4 flex items-center justify-center space-x-4">
              <span className="text-sm text-gray-400">
                {supabase ? `Signed in as ${user.email}` : 'Demo Mode'}
              </span>
              {supabase && (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Sign out
                </button>
              )}
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
                Today's Headlines
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

      {/* Fixed Bottom Actions - only show when not playing podcast */}
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
