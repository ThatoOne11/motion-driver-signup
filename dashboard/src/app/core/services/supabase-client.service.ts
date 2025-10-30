import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { createClient } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private apiUrl = environment.supabaseApiUrl;
  private apikey = environment.apikey;

  public supabaseClient = createClient(this.apiUrl, this.apikey);
}
