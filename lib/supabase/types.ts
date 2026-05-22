// Generated types stub. Regenerate with:
//   pnpm dlx supabase gen types typescript --project-id <id> --schema public > lib/supabase/types.ts
// Once generated, replace this stub with the real Database type.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type Visibility = "private" | "link" | "public";
export type CollaboratorRole = "editor" | "viewer";

export interface Board {
  id: string;
  owner_id: string;
  title: string;
  visibility: Visibility;
  link_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      boards: {
        Row: Board;
        Insert: Partial<Board> & { owner_id: string };
        Update: Partial<Board>;
      };
    };
  };
};
