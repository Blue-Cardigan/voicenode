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

export interface BoardCollaborator {
  board_id: string;
  user_id: string;
  role: CollaboratorRole;
  created_at: string;
}

export interface BoardSnapshot {
  id: string;
  board_id: string;
  document: Json;
  created_at: string;
  created_by: string | null;
}

export interface BoardEvent {
  id: string;
  board_id: string;
  actor_id: string | null;
  kind: string;
  payload: Json;
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
      board_collaborators: {
        Row: BoardCollaborator;
        Insert: Partial<BoardCollaborator> & { board_id: string; user_id: string };
        Update: Partial<BoardCollaborator>;
      };
      board_snapshots: {
        Row: BoardSnapshot;
        Insert: Partial<BoardSnapshot> & { board_id: string; document: Json };
        Update: Partial<BoardSnapshot>;
      };
      board_events: {
        Row: BoardEvent;
        Insert: Partial<BoardEvent> & { board_id: string; kind: string };
        Update: Partial<BoardEvent>;
      };
    };
  };
};
