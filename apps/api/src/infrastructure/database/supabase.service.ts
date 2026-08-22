import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './supabase.types';

@Injectable()
export class SupabaseService {
  private readonly supabase: SupabaseClient<Database>;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');

    const supabaseSecretKey = this.configService.get<string>(
      'SUPABASE_SECRET_KEY',
    );

    if (!supabaseUrl || !supabaseSecretKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  getClient(): SupabaseClient<Database> {
    return this.supabase;
  }
}
