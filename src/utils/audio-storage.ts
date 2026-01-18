import { createClient as createSupabaseClient } from '@/utils/supabase/server';
import { readFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload audio file to Supabase Storage and return public URL
 */
export async function uploadAudioToSupabase(
  audioFilePath: string,
  storyId: string
): Promise<string> {
  console.log(`📤 [Storage] Uploading audio for story ${storyId}...`);
  
  const supabase = await createSupabaseClient();
  
  // Read the audio file
  const audioBuffer = await readFile(audioFilePath);
  const fileName = `story-${storyId}-${uuidv4()}.mp3`;
  const storagePath = `podcasts/${new Date().toISOString().split('T')[0]}/${fileName}`;
  
  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('podcast-audio')
    .upload(storagePath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: false,
    });
  
  if (error) {
    console.error('❌ [Storage] Upload error:', error);
    throw new Error(`Failed to upload audio to Supabase Storage: ${error.message}`);
  }
  
  console.log(`✅ [Storage] Audio uploaded: ${storagePath}`);
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('podcast-audio')
    .getPublicUrl(storagePath);
  
  const publicUrl = urlData.publicUrl;
  console.log(`🔗 [Storage] Public URL: ${publicUrl}`);
  
  return publicUrl;
}
