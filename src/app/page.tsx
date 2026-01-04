import { getCachedHeadlines } from '@/utils/headlines-cache';
import HomeClient from '@/components/HomeClient';

// Force dynamic rendering so we always get fresh cache state
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Get headlines from server-side cache - this is instant if cache is warm
  console.log('📄 [Page] Server-rendering home page...');
  
  const cached = getCachedHeadlines();
  
  console.log(`📄 [Page] Got ${cached.headlines.length} headlines, cached: ${cached.cached}, loading: ${cached.isLoading}`);
  
  return (
    <HomeClient 
      initialHeadlines={cached.headlines}
      isInitiallyLoading={cached.isLoading}
    />
  );
}
