export type MemberRole = "owner" | "member";

export interface League {
  id: string;
  name: string;
  year: number | null;
  elo_enabled: boolean;
  elo_k: number;
  invite_token: string;
  created_by: string;
  created_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  display_name: string;
  role: MemberRole;
  created_at: string;
}

export interface Game {
  id: string;
  league_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Session {
  id: string;
  league_id: string;
  session_date: string;
  note: string | null;
  created_at: string;
}

export interface ScoreEvent {
  id: string;
  league_id: string;
  session_id: string;
  game_id: string;
  winner_member_id: string;
  participant_ids: string[];
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface AuditLog {
  id: string;
  league_id: string;
  action: string;
  payload: Record<string, unknown>;
  actor_id: string;
  created_at: string;
}

export interface EloRating {
  member_id: string;
  game_id: string | null;
  rating: number;
  updated_at: string;
}

export interface StatsFilter {
  gameId?: string;
  dateFrom?: string;
  dateTo?: string;
  playerCount?: number;
  rosterIds?: string[];
}

export interface MemberStats {
  member_id: string;
  display_name: string;
  wins: number;
  games_played: number;
  win_rate: number;
  elo?: number;
}
