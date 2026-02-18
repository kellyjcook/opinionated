import { supabase } from './supabase';

/** Fire-and-forget error logging to Supabase (replicates WaitingGameApp pattern) */
export function logError(
  source: string,
  message: string,
  context?: Record<string, unknown>,
  severity: 'error' | 'warn' | 'info' = 'error'
): void {
  console.error(`[${source}]`, message, context);

  supabase
    .from('error_logs')
    .insert({
      error_source: source,
      error_message: message,
      error_context: context ?? null,
      severity,
    })
    .then(({ error }) => {
      if (error) console.warn('Failed to log error to Supabase:', error.message);
    });
}
