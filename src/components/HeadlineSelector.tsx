'use client';

import { useState } from 'react';

interface HeadlineSelectorProps {
  headlines: string[];
  selectedHeadlines: string[];
  onSelectionChange: (selected: string[]) => void;
}

export function HeadlineSelector({ headlines, selectedHeadlines, onSelectionChange }: HeadlineSelectorProps) {
  const handleToggleHeadline = (headline: string) => {
    const isSelected = selectedHeadlines.includes(headline);
    
    if (isSelected) {
      onSelectionChange(selectedHeadlines.filter(h => h !== headline));
    } else {
      if (selectedHeadlines.length < 6) {
        onSelectionChange([...selectedHeadlines, headline]);
      }
    }
  };

  const isMaxSelected = selectedHeadlines.length >= 6;

  return (
    <div className="bg-gray-900 rounded-lg shadow-md p-6 border border-gray-800">
      <div className="mb-6">
        <p className="text-gray-300 mb-4">
          Choose up to six stories
        </p>
      </div>

      {/* Headlines List */}
      <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollable-list">
        {headlines.map((headline, index) => {
          const isSelected = selectedHeadlines.includes(headline);
          const isDisabled = !isSelected && isMaxSelected;
          
          return (
            <div
              key={index}
              className={`border rounded-lg p-4 transition-all cursor-pointer ${
                isSelected 
                  ? 'border-blue-500 bg-blue-900 bg-opacity-30' 
                  : isDisabled
                  ? 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                  : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
              }`}
              onClick={() => !isDisabled && handleToggleHeadline(headline)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => !isDisabled && handleToggleHeadline(headline)}
                    disabled={isDisabled}
                    className="w-5 h-5 text-blue-600 border-gray-600 bg-gray-700 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium leading-relaxed ${
                    isSelected ? 'text-blue-300' : 'text-white'
                  }`}>
                    {headline}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
