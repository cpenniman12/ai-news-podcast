// Supabase storage utilities for daily podcast audio files
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side storage operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const AUDIO_BUCKET = 'daily-podcast-audio';

export interface DailyEpisode {
  id: string;
  episode_date: string;
  story_1_title: string;
  story_1_script: string;
  story_1_audio_url: string | null;
  story_1_duration_seconds: number | null;
  story_2_title: string;
  story_2_script: string;
  story_2_audio_url: string | null;
  story_2_duration_seconds: number | null;
  generation_status: 'pending' | 'generating' | 'completed' | 'failed';
  error_message: string | null;
  total_headlines_processed: number | null;
  created_at: string;
  updated_at: string;
}

export interface StoryContent {
  title: string;
  script: string;
  audioBuffer?: Buffer;
  duration?: number;
}

/**
 * Ensure the audio storage bucket exists
 */
export async function ensureAudioBucket(): Promise<void> {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('❌ [Storage] Error listing buckets:', listError);
      throw listError;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === AUDIO_BUCKET);
    
    if (!bucketExists) {
      console.log('📦 [Storage] Creating audio bucket...');
      const { error: createError } = await supabaseAdmin.storage.createBucket(AUDIO_BUCKET, {
        public: true,
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
      });
      
      if (createError) {
        console.error('❌ [Storage] Error creating bucket:', createError);
        throw createError;
      }
      
      console.log('✅ [Storage] Audio bucket created successfully');
    } else {
      console.log('✅ [Storage] Audio bucket already exists');
    }
  } catch (error) {
    console.error('💥 [Storage] Error ensuring bucket:', error);
    throw error;
  }
}

/**
 * Upload audio file to Supabase storage
 */
export async function uploadAudioFile(
  audioBuffer: Buffer,
  fileName: string
): Promise<string> {
  try {
    console.log(`📤 [Storage] Uploading audio file: ${fileName}`);
    
    const { data, error } = await supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (error) {
      console.error('❌ [Storage] Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .getPublicUrl(fileName);

    console.log(`✅ [Storage] Audio uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error(`💥 [Storage] Error uploading ${fileName}:`, error);
    throw error;
  }
}

/**
 * Save daily episode to database
 */
export async function saveDailyEpisode(
  date: string,
  story1: StoryContent,
  story2: StoryContent,
  totalHeadlines: number
): Promise<DailyEpisode> {
  try {
    console.log(`💾 [Database] Saving daily episode for ${date}`);
    
    // Upload audio files if they exist
    let story1AudioUrl: string | null = null;
    let story2AudioUrl: string | null = null;
    
    if (story1.audioBuffer) {
      const fileName1 = `${date}-story-1.mp3`;
      story1AudioUrl = await uploadAudioFile(story1.audioBuffer, fileName1);
    }
    
    if (story2.audioBuffer) {
      const fileName2 = `${date}-story-2.mp3`;
      story2AudioUrl = await uploadAudioFile(story2.audioBuffer, fileName2);
    }

    // Insert or update database record
    const { data, error } = await supabaseAdmin
      .from('daily_episodes')
      .upsert({
        episode_date: date,
        story_1_title: story1.title,
        story_1_script: story1.script,
        story_1_audio_url: story1AudioUrl,
        story_1_duration_seconds: story1.duration || null,
        story_2_title: story2.title,
        story_2_script: story2.script,
        story_2_audio_url: story2AudioUrl,
        story_2_duration_seconds: story2.duration || null,
        generation_status: 'completed',
        total_headlines_processed: totalHeadlines,
      }, {
        onConflict: 'episode_date'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [Database] Error saving episode:', error);
      throw error;
    }

    console.log(`✅ [Database] Daily episode saved successfully for ${date}`);
    return data as DailyEpisode;
    
  } catch (error) {
    console.error(`💥 [Database] Error saving daily episode:`, error);
    throw error;
  }
}

/**
 * Get daily episode for a specific date
 */
export async function getDailyEpisode(date: string): Promise<DailyEpisode | null> {
  try {
    console.log(`🔍 [Database] Fetching daily episode for ${date}`);
    
    const { data, error } = await supabaseAdmin
      .from('daily_episodes')
      .select('*')
      .eq('episode_date', date)
      .eq('generation_status', 'completed')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        console.log(`📭 [Database] No episode found for ${date}`);
        return null;
      }
      console.error('❌ [Database] Error fetching episode:', error);
      throw error;
    }

    console.log(`✅ [Database] Found episode for ${date}`);
    return data as DailyEpisode;
    
  } catch (error) {
    console.error(`💥 [Database] Error fetching daily episode:`, error);
    throw error;
  }
}

/**
 * Update episode generation status
 */
export async function updateEpisodeStatus(
  date: string,
  status: 'pending' | 'generating' | 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    console.log(`📝 [Database] Updating episode status to ${status} for ${date}`);
    
    const { error } = await supabaseAdmin
      .from('daily_episodes')
      .upsert({
        episode_date: date,
        generation_status: status,
        error_message: errorMessage || null,
      }, {
        onConflict: 'episode_date'
      });

    if (error) {
      console.error('❌ [Database] Error updating status:', error);
      throw error;
    }

    console.log(`✅ [Database] Status updated successfully for ${date}`);
    
  } catch (error) {
    console.error(`💥 [Database] Error updating episode status:`, error);
    throw error;
  }
}

/**
 * Get latest available episode (fallback logic)
 */
export async function getLatestEpisode(): Promise<DailyEpisode | null> {
  try {
    console.log('🔍 [Database] Fetching latest available episode');
    
    const { data, error } = await supabaseAdmin
      .from('daily_episodes')
      .select('*')
      .eq('generation_status', 'completed')
      .order('episode_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('📭 [Database] No episodes found');
        return null;
      }
      console.error('❌ [Database] Error fetching latest episode:', error);
      throw error;
    }

    console.log(`✅ [Database] Found latest episode: ${data.episode_date}`);
    return data as DailyEpisode;
    
  } catch (error) {
    console.error('💥 [Database] Error fetching latest episode:', error);
    throw error;
  }
}