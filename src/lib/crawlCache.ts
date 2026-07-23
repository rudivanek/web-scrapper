import { supabase } from './supabase';

export interface CachedPage {
  url: string;
  metadata: any;
  links: any[];
  scraped_at: string;
}

export async function getCachedPages(userId: string, domain: string): Promise<CachedPage[]> {
  const { data, error } = await supabase
    .from('crawl_cache')
    .select('url, metadata, links, scraped_at')
    .eq('user_id', userId)
    .eq('domain', domain)
    .order('scraped_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch cached pages:', error);
    return [];
  }

  return data || [];
}

export async function getCachedPage(userId: string, url: string): Promise<CachedPage | null> {
  const { data, error } = await supabase
    .from('crawl_cache')
    .select('url, metadata, links, scraped_at')
    .eq('user_id', userId)
    .eq('url', url)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch cached page:', error);
    return null;
  }

  return data;
}

export async function saveCachedPage(
  userId: string,
  domain: string,
  url: string,
  metadata: any,
  links: any[]
): Promise<boolean> {
  const { error } = await supabase
    .from('crawl_cache')
    .upsert(
      {
        user_id: userId,
        domain,
        url,
        metadata,
        links,
        scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,url',
      }
    );

  if (error) {
    console.error('Failed to save cached page:', error);
    return false;
  }

  return true;
}

export async function clearCacheForDomain(userId: string, domain: string): Promise<boolean> {
  const { error } = await supabase
    .from('crawl_cache')
    .delete()
    .eq('user_id', userId)
    .eq('domain', domain);

  if (error) {
    console.error('Failed to clear cache:', error);
    return false;
  }

  return true;
}

export async function isCacheValid(
  cachedPages: CachedPage[],
  maxAgeHours: number = 24
): Promise<boolean> {
  if (cachedPages.length === 0) return false;

  const oldestPage = cachedPages[cachedPages.length - 1];
  const scrapedAt = new Date(oldestPage.scraped_at);
  const now = new Date();
  const hoursDiff = (now.getTime() - scrapedAt.getTime()) / (1000 * 60 * 60);

  return hoursDiff < maxAgeHours;
}
