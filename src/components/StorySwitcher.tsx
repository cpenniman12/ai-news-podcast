'use client';

import { useState, useEffect } from 'react';
import { AudioPlayer } from './AudioPlayer';

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

interface StorySwitcherProps {
  episode: Episode;
  stories: Story[];
}

export function StorySwitcher({ episode, stories }: StorySwitcherProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const currentStory = stories[currentStoryIndex];
  const canGoBack = currentStoryIndex > 0;
  const canGoForward = currentStoryIndex < stories.length - 1;

  const handlePrevious = () => {
    if (canGoBack) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    }
  };

  const handleStoryEnd = () => {
    // Auto-advance to next story when current finishes
    if (canGoForward) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    }
  };

  // Parse headline to extract title
  const parseHeadline = (headline: string) => {
    const match = headline.match(/\*\*(.*?)\*\*\s*\((.*?)\)/);
    if (match) {
      return {
        title: match[1],
        date: match[2],
      };
    }
    return {
      title: headline,
      date: 'Recent',
    };
  };

  const { title, date } = parseHeadline(currentStory.headline);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="px-5 py-6 md:px-10 md:py-10 md:pb-8">
        <div className="max-w-[680px] mx-auto">
          <h1 className="text-[1.75rem] md:text-4xl font-semibold tracking-tight mb-2 md:mb-3">
            The latest AI news, by AI
          </h1>
          <p className="text-base md:text-lg text-white text-opacity-60 font-normal">
            {episode.title}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-[120px]">
        <div className="max-w-[680px] mx-auto px-5 py-8 md:px-10 md:py-12">
          {/* Story Navigation Info */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-white text-opacity-50 mb-1">
                Story {currentStoryIndex + 1} of {stories.length}
              </h2>
              <h3 className="text-[1.0625rem] md:text-[1.125rem] font-medium tracking-tight text-white">
                {title}
              </h3>
              <p className="text-sm text-white text-opacity-50 mt-1">{date}</p>
            </div>
          </div>

          {/* Audio Player */}
          <AudioPlayer
            audioUrl={currentStory.audio_url}
            onStoryEnd={handleStoryEnd}
            onPrevious={canGoBack ? handlePrevious : undefined}
            onNext={canGoForward ? handleNext : undefined}
            currentStory={currentStoryIndex + 1}
            totalStories={stories.length}
          />
        </div>
      </main>

      {/* Navigation Controls - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 backdrop-blur-[20px] p-5 md:p-6 z-[1000]">
        <div className="max-w-[680px] mx-auto flex items-center justify-center gap-6">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={!canGoBack}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
              ${canGoBack
                ? 'bg-white bg-opacity-20 text-white hover:bg-opacity-30 active:scale-95'
                : 'bg-white bg-opacity-10 text-white text-opacity-30 cursor-not-allowed'
              }
            `}
            aria-label="Previous story"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Story Counter */}
          <div className="text-center">
            <div className="text-sm text-white text-opacity-60">
              {currentStoryIndex + 1} / {stories.length}
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!canGoForward}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200
              ${canGoForward
                ? 'bg-white bg-opacity-20 text-white hover:bg-opacity-30 active:scale-95'
                : 'bg-white bg-opacity-10 text-white text-opacity-30 cursor-not-allowed'
              }
            `}
            aria-label="Next story"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
