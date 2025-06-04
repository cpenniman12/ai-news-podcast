'use client';

import { useState } from 'react';

interface PodcastGeneratorProps {
  selectedHeadlines: string[];
  onGenerate: () => void;
  onComplete: (url: string) => void;
  isGenerating: boolean;
}

export function PodcastGenerator({ selectedHeadlines, onGenerate, onComplete, isGenerating }: PodcastGeneratorProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const isValidSelection = selectedHeadlines.length >= 2 && selectedHeadlines.length <= 6;

  const generatePodcast = async () => {
    if (!isValidSelection) return;
    
    onGenerate();
    setProgress(0);
    setCurrentStep('Researching selected stories in detail...');

    try {
      // Step 1: Generate detailed script with research
      setProgress(20);
      const scriptRes = await fetch('/api/generate-detailed-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines: selectedHeadlines }),
      });
      
      if (!scriptRes.ok) {
        const errorData = await scriptRes.text();
        console.error('Script generation failed:', errorData);
        throw new Error('Failed to generate detailed script');
      }
      
      const { script, stats } = await scriptRes.json();
      console.log('📊 Script generation stats:', stats);
      
      setProgress(70);
      setCurrentStep('Converting script to high-quality audio...');

      // Step 2: Generate audio from detailed script
      const audioRes = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });
      
      if (!audioRes.ok) {
        const errorData = await audioRes.text();
        console.error('Audio generation failed:', errorData);
        throw new Error('Failed to generate audio');
      }
      
      // Get the audio blob and create a URL for it
      const audioBlob = await audioRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      setProgress(100);
      setCurrentStep('Your detailed podcast is ready!');
      
      console.log('✅ Podcast generation completed successfully');
      onComplete(audioUrl);
      
    } catch (err) {
      console.error('❌ Podcast generation error:', err);
      setCurrentStep('An error occurred while generating your podcast. Please try again.');
      setProgress(0);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-md p-6 border border-gray-800">
      {!isGenerating ? (
        <>
          <div className="text-center mb-6">
            <p className="text-gray-300 text-lg">
              Click generate to send GPT off to do some research on these stories. This may take a minute.
            </p>
          </div>

          {/* Generate Button */}
          <button
            onClick={generatePodcast}
            disabled={!isValidSelection}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Generate</span>
          </button>

          {!isValidSelection && (
            <p className="text-center text-sm text-gray-400 mt-4">
              Please select 2-6 stories to generate your podcast
            </p>
          )}
        </>
      ) : (
        <>
          {/* Enhanced Generating State */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-900 bg-opacity-50 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Creating Your Enhanced Podcast</h2>
            <p className="text-gray-300">Researching stories and generating detailed content...</p>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Current Step with More Detail */}
          <div className="text-center">
            <p className="text-gray-300 font-medium mb-2">{currentStep}</p>
            {progress < 70 && (
              <p className="text-sm text-gray-400">
                We're gathering detailed information about each story from multiple sources...
              </p>
            )}
            {progress >= 70 && progress < 100 && (
              <p className="text-sm text-gray-400">
                Converting your detailed script to natural-sounding audio...
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
