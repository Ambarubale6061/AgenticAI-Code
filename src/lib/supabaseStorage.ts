// src/lib/supabaseStorage.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads an avatar image for the current user.
 * @param userId The authenticated user ID.
 * @param file The image file to upload.
 * @returns Public URL of the uploaded avatar.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}