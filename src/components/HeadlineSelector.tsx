'use client';

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

  // Extract date from headline if it exists (format: "**Title** (Date)")
  const parseHeadline = (headline: string) => {
    const match = headline.match(/\*\*(.*?)\*\*\s*\((.*?)\)/);
    if (match) {
      return {
        title: match[1],
        date: match[2]
      };
    }
    return {
      title: headline,
      date: 'Recent'
    };
  };

  return (
    <div className="flex flex-col">
      {headlines.map((headline, index) => {
        const isSelected = selectedHeadlines.includes(headline);
        const isMaxSelected = selectedHeadlines.length >= 6;
        const isDisabled = !isSelected && isMaxSelected;
        const { title, date } = parseHeadline(headline);
        
        return (
          <div
            key={index}
            className={`
              py-5 md:py-6 cursor-pointer transition-all duration-200 relative select-none
              ${isSelected ? 'pl-5' : ''}
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${!isDisabled ? 'active:opacity-70 md:hover:pl-3' : ''}
            `}
            onClick={() => !isDisabled && handleToggleHeadline(headline)}
          >
            {/* Selection indicator dot */}
            {isSelected && (
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-white rounded-full" />
            )}
            
            <h3 className={`
              text-[1.0625rem] md:text-[1.125rem] mb-1.5 leading-[1.4] font-medium tracking-tight
              ${isSelected ? 'text-white' : 'text-white text-opacity-90 md:text-opacity-85'}
              ${!isDisabled ? 'md:hover:text-white' : ''}
            `}>
              {title}
            </h3>
            
            <div className="text-sm text-white text-opacity-50">
              {date}
            </div>
          </div>
        );
      })}
    </div>
  );
}
