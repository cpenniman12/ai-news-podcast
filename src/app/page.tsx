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
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isHeadlinesLoading, setIsHeadlinesLoading] = useState(false);
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [headlineError, setHeadlineError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Skip all authentication - just set auth loading to false
    console.log('🔧 Authentication disabled, using demo mode');
    setIsAuthLoading(false);
  }, []);

  // Fetch headlines from Perplexity
  const fetchHeadlines = async () => {
    console.log('🚀 Starting to fetch headlines...');
    try {
      setIsHeadlinesLoading(true);
      console.log('📰 Headlines loading state set to true');
      setHeadlineError(null);
      console.log('🔗 Calling fetchTechNewsHeadlines...');
      const fetched = await fetchTechNewsHeadlines();
      console.log('✅ Headlines fetched successfully:', fetched.length, 'headlines');
      console.log('📋 Headlines:', fetched);
      setHeadlines(fetched);
    } catch (err) {
      console.error('❌ Error fetching headlines:', err);
      setHeadlineError('Failed to fetch news headlines. Please try again later.');
    } finally {
      setIsHeadlinesLoading(false);
      console.log('🏁 Headlines loading complete');
    }
  };

  useEffect(() => {
    console.log('🔍 useEffect for headlines triggered');
    console.log('  - isAuthLoading:', isAuthLoading);
    console.log('  - user:', user?.email || 'No user');
    
    // Fetch headlines immediately since auth is disabled
    if (!isAuthLoading && user) {
      console.log('✅ Conditions met, fetching headlines...');
      fetchHeadlines();
    } else {
      console.log('⏳ Waiting for auth or user...');
    }
  }, [isAuthLoading, user]);

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

  console.log('🎨 Rendering component with state:');
  console.log('  - isAuthLoading:', isAuthLoading);
  console.log('  - isHeadlinesLoading:', isHeadlinesLoading);
  console.log('  - user:', user?.email || 'No user');
  console.log('  - headlines count:', headlines.length);
  console.log('  - headlineError:', headlineError);

  // Auth loading state
  if (isAuthLoading) {
    console.log('🔄 Showing auth loading screen');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-white mb-3">Initializing Your AI News Podcast</h2>
          <p className="text-gray-300 mb-2">
            Setting up your personalized news experience...
          </p>
          <p className="text-sm text-gray-400">
            Just a moment while we get everything ready.
          </p>
        </div>
      </div>
    );
  }

  // Headlines loading state (after auth is complete and user is signed in)
  if (user && isHeadlinesLoading) {
    console.log('🔄 Showing headlines loading screen');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-white mb-3">Loading Latest AI News</h2>
          <p className="text-gray-300 mb-2">
            Searching multiple news sources including TechCrunch, The Verge, Reuters, and Bloomberg...
          </p>
          <p className="text-sm text-gray-400">
            This may take a moment to ensure we get the most recent stories.
          </p>
          
          {/* Progress indicator */}
          <div className="mt-6">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Gathering the latest AI & tech headlines...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state (if there's an error loading headlines)
  if (headlineError) {
    console.log('❌ Showing headlines error screen');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">Unable to Load Headlines</h2>
          <p className="text-gray-300 mb-6">
            We're having trouble connecting to our news sources. This might be due to high demand or a temporary service issue.
          </p>
          <button
            onClick={fetchHeadlines}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Loading state while waiting for headlines to load (no user or no headlines yet)
  if (!user || (user && headlines.length === 0 && !headlineError)) {
    console.log('🔄 Showing combined loading screen (waiting for user or headlines)');
    
    // Since auth is disabled, just show headlines loading
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-white mb-3">Loading Latest AI News</h2>
          <p className="text-gray-300 mb-2">
            Searching multiple news sources including TechCrunch, The Verge, Reuters, and Bloomberg...
          </p>
          <p className="text-sm text-gray-400">
            This may take a moment to ensure we get the most recent stories.
          </p>
          
          {/* Progress indicator */}
          <div className="mt-6">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Gathering the latest AI & tech headlines...</p>
          </div>
        </div>
      </div>
    );
  }

  // Main app interface (only shown when user is authenticated AND headlines are loaded)
  console.log('✅ Showing main app interface');
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="px-5 py-6 border-b border-white border-opacity-10 md:px-10 md:py-10 md:pb-8">
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
        <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 backdrop-blur-[20px] border-t border-white border-opacity-10 p-5 md:p-6 z-[1000]">
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
