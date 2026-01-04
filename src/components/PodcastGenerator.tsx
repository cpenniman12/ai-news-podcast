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

  const isValidSelection = selectedHeadlines.length >= 1 && selectedHeadlines.length <= 6;

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
      
      // Expecting: { script: string, scripts: string[], stats: object }
      const { script, scripts, stats } = await scriptRes.json();
      console.log('📊 Script generation stats:', stats);
      
      setProgress(70);
      setCurrentStep('Converting script to high-quality audio...');

      // Step 2: Generate audio from array of story scripts
      const audioRes = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scripts: scripts || [script] }),
      });
      
      if (!audioRes.ok) {
        const errorData = await audioRes.text();
        console.error('Audio generation failed:', errorData);
        throw new Error('Failed to generate audio');
      }
      
      // Get the audio blob and create a URL for it
      const audioBlob = await audioRes.blob();
      console.log('🎵 Audio blob received:', {
        size: audioBlob.size,
        type: audioBlob.type,
      });
      
      // Ensure the blob has the correct MIME type for audio playback
      const typedBlob = audioBlob.type === 'audio/mpeg' 
        ? audioBlob 
        : new Blob([audioBlob], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(typedBlob);
      console.log('🔗 Audio URL created:', audioUrl);
      
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

  if (isGenerating) {
    return (
      <div className="w-full max-w-md">
        {/* Current step */}
        <div className="text-center">
          <p className="text-white text-opacity-90 font-medium">
            researching headlines. this may take a few minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={generatePodcast}
      disabled={!isValidSelection}
      className={`
        px-8 py-3.5 md:px-10 md:py-4 border-0 rounded-3xl text-[0.9375rem] md:text-base font-medium cursor-pointer transition-all duration-200 min-w-[200px] md:min-w-[240px]
        ${isValidSelection 
          ? 'bg-white text-black active:scale-[0.98] md:hover:-translate-y-0.5 md:hover:bg-white md:hover:bg-opacity-90' 
          : 'bg-white bg-opacity-20 text-gray-400 cursor-not-allowed'
        }
      `}
    >
      Generate Podcast
    </button>
  );
}
