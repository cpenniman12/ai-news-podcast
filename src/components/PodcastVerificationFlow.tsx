'use client';

import { useState } from 'react';

interface PodcastVerificationFlowProps {
  selectedHeadlines: string[];
  onGenerate: () => void;
  onComplete: (url: string) => void;
  isGenerating: boolean;
}

interface VerificationState {
  step: 'email' | 'verification-sent' | 'generating';
  email: string;
  error: string;
  isLoading: boolean;
}

export function PodcastVerificationFlow({ selectedHeadlines, onGenerate, onComplete, isGenerating }: PodcastVerificationFlowProps) {
  const [verificationState, setVerificationState] = useState<VerificationState>({
    step: 'email',
    email: '',
    error: '',
    isLoading: false
  });

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const isValidSelection = selectedHeadlines.length >= 1 && selectedHeadlines.length <= 6;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationState.email);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail) return;

    setVerificationState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {
      // Check verification status and rate limits
      const verifyRes = await fetch('/api/verify-and-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: verificationState.email, 
          headlines: selectedHeadlines,
          isRetryAfterVerification: false
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.requiresVerification) {
        // Send verification email
        const emailRes = await fetch('/api/send-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: verificationState.email }),
        });

        if (emailRes.ok) {
          setVerificationState(prev => ({
            ...prev,
            step: 'verification-sent',
            isLoading: false
          }));
        } else {
          const emailError = await emailRes.json();
          setVerificationState(prev => ({
            ...prev,
            error: emailError.error || 'Failed to send verification email',
            isLoading: false
          }));
        }
      } else if (verifyData.canGenerate) {
        // User can generate immediately
        setVerificationState(prev => ({ ...prev, step: 'generating', isLoading: false }));
        await generatePodcast();
      } else if (verifyData.rateLimited) {
        setVerificationState(prev => ({
          ...prev,
          error: verifyData.message,
          isLoading: false
        }));
      } else {
        setVerificationState(prev => ({
          ...prev,
          error: verifyData.error || 'Verification failed',
          isLoading: false
        }));
      }
    } catch (err) {
      setVerificationState(prev => ({
        ...prev,
        error: 'An unexpected error occurred. Please try again.',
        isLoading: false
      }));
    }
  };

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
      const audioUrl = URL.createObjectURL(audioBlob);
      
      setProgress(100);
      setCurrentStep('Your detailed podcast is ready!');
      
      // Record the generation for rate limiting (don't wait for this)
      fetch('/api/record-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: verificationState.email,
          episodeId: null // Could generate and pass episode ID here
        }),
      }).catch(err => console.warn('Failed to record generation:', err));
      
      console.log('✅ Podcast generation completed successfully');
      onComplete(audioUrl);
      
    } catch (err) {
      console.error('❌ Podcast generation error:', err);
      setCurrentStep('An error occurred while generating your podcast. Please try again.');
      setProgress(0);
    }
  };

  const handleRetryAfterVerification = async () => {
    setVerificationState(prev => ({ ...prev, isLoading: true, error: '' }));
    
    try {
      const verifyRes = await fetch('/api/verify-and-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: verificationState.email, 
          headlines: selectedHeadlines,
          isRetryAfterVerification: true
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.canGenerate) {
        setVerificationState(prev => ({ ...prev, step: 'generating', isLoading: false }));
        await generatePodcast();
      } else {
        setVerificationState(prev => ({
          ...prev,
          error: verifyData.message || 'Please complete email verification first',
          isLoading: false
        }));
      }
    } catch (err) {
      setVerificationState(prev => ({
        ...prev,
        error: 'An unexpected error occurred. Please try again.',
        isLoading: false
      }));
    }
  };

  if (isGenerating || verificationState.step === 'generating') {
    return (
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="text-white text-opacity-90 font-medium">
            researching headlines. this may take a few minutes.
          </p>
        </div>
      </div>
    );
  }

  if (verificationState.step === 'verification-sent') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mx-auto max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email!</h2>
          <p className="text-gray-600 mb-4">
            We've sent a verification link to <strong>{verificationState.email}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Click the link in your email to verify your account, then come back to generate your podcast.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRetryAfterVerification}
            disabled={verificationState.isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {verificationState.isLoading ? 'Checking...' : 'I\'ve verified my email'}
          </button>
          
          <button
            onClick={() => setVerificationState(prev => ({ ...prev, step: 'email', error: '' }))}
            className="w-full text-blue-600 hover:text-blue-700 font-medium py-2 text-sm"
          >
            ← Use a different email
          </button>
        </div>

        {verificationState.error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{verificationState.error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Email input form */}
      <div className="bg-white rounded-lg shadow-md p-6 mx-auto max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Your Podcast</h2>
          <p className="text-gray-600">Enter your email to create your personalized AI news podcast</p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={verificationState.email}
              onChange={(e) => setVerificationState(prev => ({ ...prev, email: e.target.value, error: '' }))}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          {verificationState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{verificationState.error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValidEmail || !isValidSelection || verificationState.isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {verificationState.isLoading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <span>Generate Podcast</span>
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Rate Limits:</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Free users: 1 podcast per day</li>
            <li>• Email verification required for generation</li>
            <li>• Fresh headlines updated daily</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 