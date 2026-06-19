export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserGame {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export type SessionStatus = "active" | "ended";

/** Режим начисления: classic — +1 победа; smart — очки за место (N − место + 1). */
export type ScoringMode = "classic" | "smart";

export interface Session {
  id: string;
  session_date: string;
  note: string | null;
  game_name?: string | null;
  created_by?: string | null;
  status?: SessionStatus;
  started_at?: string | null;
  ended_at?: string | null;
  scoring_mode?: ScoringMode;
  /** Число мест (= максимум очков) для умного режима. */
  participant_slots?: number | null;
  created_at: string;
}

export interface BattleParticipant {
  id: string;
  session_id: string;
  display_name: string;
  user_id: string | null;
  created_at: string;
}

export interface ScoreEvent {
  id: string;
  session_id: string;
  winner_participant_id: string;
  participant_ids: string[];
  /** Места участников за раунд в умном режиме: { participant_id: место }. */
  placements?: Record<string, number> | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
  /** из join sessions */
  game_name?: string;
  scoring_mode?: ScoringMode;
  participant_slots?: number | null;
}

/** Игрок для агрегированной статистики (по имени) */
export interface StatsPlayer {
  id: string;
  display_name: string;
}

export interface StatsFilter {
  gameName?: string;
  dateFrom?: string;
  dateTo?: string;
  playerCount?: number;
  rosterIds?: string[];
  /** Фильтр по режиму: undefined/"all" — оба, иначе только classic или smart. */
  scoringMode?: ScoringMode | "all";
}

export interface MemberStats {
  member_id: string;
  display_name: string;
  wins: number;
  games_played: number;
  win_rate: number;
  /** Сумма очков за места (умный режим). */
  points: number;
}
