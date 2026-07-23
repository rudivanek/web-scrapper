import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Crawl {
  id: string;
  user_id: string;
  domain: string;
  name: string | null;
  total_urls: number;
  included_meta: boolean;
  tags: string[] | null;
  tokens_used: number | null;
  tokens_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface CrawlResult {
  id: string;
  crawl_id: string;
  url: string;
  title: string | null;
  description: string | null;
  h1_tags: string[] | null;
  h2_tags: string[] | null;
  h3_tags: string[] | null;
  h4_tags: string[] | null;
  h5_tags: string[] | null;
  h6_tags: string[] | null;
  images: string[] | null;
  links: string[] | null;
  analyzed: boolean;
  status_code: number | null;
  indexable: boolean | null;
  canonical_url: string | null;
  word_count: number | null;
  images_without_alt: number | null;
  kw_1: string | null;
  kw_2: string | null;
  kw_3: string | null;
  kw_4: string | null;
  kw_5: string | null;
  kw_6: string | null;
  kw_7: string | null;
  kw_8: string | null;
  kw_9: string | null;
  kw_10: string | null;
  metadata: any | null;
  created_at: string;
}

export interface SEOAnalysis {
  id: string;
  user_id: string;
  domain: string;
  name: string | null;
  tags: string[] | null;
  tokens_used: number | null;
  tokens_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface SavedItem {
  id: string;
  type: 'crawler' | 'seo';
  domain: string;
  name: string | null;
  total_urls?: number;
  tags: string[] | null;
  tokens_used: number | null;
  tokens_cost: number | null;
  created_at: string;
}
