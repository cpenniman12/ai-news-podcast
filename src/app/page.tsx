'use client';

import { useState, useEffect } from 'react';
import { StorySwitcher } from '@/components/StorySwitcher';

interface Story {
  id: string;
  headline: string;
  script: string;
  audio_url: string;
  order: number;
}

interface Episode {
  id: string;
  title: string;
  created_at: string;
}

export default function Home() {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch latest episode on mount
  useEffect(() => {
    console.log('🚀 Fetching latest episode...');
    fetch('/api/episodes/latest')
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          if (res.status === 404) {
            setError(data.message || 'No podcast available yet');
          } else {
            setError(data.error || 'Failed to load podcast');
          }
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        console.log('✅ Episode fetched:', data.episode.title, data.stories.length, 'stories');
        setEpisode(data.episode);
        setStories(data.stories);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('❌ Error fetching episode:', err);
        setError('Failed to load podcast. Please try again later.');
        setIsLoading(false);
      });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-white mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-white text-opacity-60">Loading podcast...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !episode || stories.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-[680px] mx-auto px-5 text-center">
          <h1 className="text-[1.75rem] md:text-4xl font-semibold tracking-tight mb-4 text-white">
            The latest AI news, by AI
          </h1>
          <p className="text-base md:text-lg text-white text-opacity-60 mb-6">
            {error || 'No podcast available yet'}
          </p>
          <p className="text-sm text-white text-opacity-40">
            The daily podcast is generated at 6 AM ET. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  // Show StorySwitcher
  return <StorySwitcher episode={episode} stories={stories} />;
}
