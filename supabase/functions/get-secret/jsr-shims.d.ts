declare module 'jsr:@supabase/supabase-js@2' {
  export function createClient(
    url: string,
    key: string
  ): {
    rpc(
      fn: string,
      args: Record<string, unknown>
    ): Promise<{
      data: unknown;
      error: { message: string } | null;
    }>;
  };
}
