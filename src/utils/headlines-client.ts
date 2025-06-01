// Client-side utility to fetch headlines from our API route
export async function fetchTechNewsHeadlines(): Promise<string[]> {
  console.log('🔌 fetchTechNewsHeadlines called (Client → API Route)');
  
  try {
    console.log('🚀 Making request to /api/headlines...');
    
    const response = await fetch('/api/headlines', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`📊 API Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error Response:', errorData);
      throw new Error(errorData.error || 'Failed to fetch headlines');
    }
    
    const data = await response.json();
    console.log(`✅ Successfully received ${data.headlines.length} headlines`);
    console.log('📋 First few headlines:', data.headlines.slice(0, 3));
    
    return data.headlines;
    
  } catch (error) {
    console.error('💥 ERROR in client headline fetching:', error);
    throw new Error('Failed to fetch news headlines');
  }
} 