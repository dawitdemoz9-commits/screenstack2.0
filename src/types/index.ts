// ─── ScreenStack — Shared Types ───────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'RECRUITER';

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// ─── Question types ───────────────────────────────────────────────────────────

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTI_SELECT'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'CODING_CHALLENGE'
  | 'SQL_CHALLENGE'
  | 'DEBUGGING_CHALLENGE'
  | 'FILE_UPLOAD'
  | 'SCENARIO'
  | 'ARCHITECTURE'
  | 'ENTERPRISE_SCENARIO';

export type EvaluatorType =
  | 'multiple_choice'
  | 'multi_select'
  | 'code'
  | 'sql'
  | 'manual'
  | 'scenario';

// ─── Question configs (stored in Question.config JSON) ─────────────────────

export interface MultipleChoiceConfig {
  options: { label: string; value: string }[];
  correct: string; // matches value
  explanation?: string;
}

export interface MultiSelectConfig {
  options: { label: string; value: string }[];
  correct: string[]; // array of values
  partialCredit?: boolean;
}

export interface CodeChallengeConfig {
  language: string;
  starterCode: string;
  testCases: {
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
    description?: string;
  }[];
  solutionCode?: string; // for reference
}

export interface SqlChallengeConfig {
  schema: string;         // DDL to create tables + INSERT sample data
  prompt: string;         // What query to write
  expectedSql?: string;   // Reference solution
  expectedResultHash?: string; // For comparison
  hints?: string[];
}

export interface ScenarioConfig {
  rubric: {
    criterion: string;
    maxPoints: number;
    guidance: string;
  }[];
  modelAnswer?: string;
}

// ─── Monitoring ─────────────────────────────────────────────────────────────

export type MonitoringEventType =
  | 'page_hidden'
  | 'page_visible'
  | 'window_blur'
  | 'window_focus'
  | 'copy'
  | 'paste'
  | 'large_paste'
  | 'fullscreen_exit'
  | 'fullscreen_enter'
  | 'permission_denied'
  | 'permission_revoked'
  | 'network_disconnect'
  | 'network_reconnect'
  | 'inactivity'
  | 'tab_switch'
  | 'devtools_open'
  | 'right_click';

export type EventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MonitoringEventPayload {
  attemptId: string;
  eventType: MonitoringEventType;
  metadata?: Record<string, unknown>;
  timestamp: string; // ISO string from client
}

// Configured suspicion scores per event type
export const EVENT_SUSPICION_SCORES: Record<MonitoringEventType, { severity: EventSeverity; delta: number }> = {
  page_hidden:        { severity: 'MEDIUM', delta: 5  },
  page_visible:       { severity: 'LOW',    delta: 0  },
  window_blur:        { severity: 'LOW',    delta: 2  },
  window_focus:       { severity: 'LOW',    delta: 0  },
  copy:               { severity: 'LOW',    delta: 1  },
  paste:              { severity: 'MEDIUM', delta: 5  },
  large_paste:        { severity: 'HIGH',   delta: 15 },
  fullscreen_exit:    { severity: 'MEDIUM', delta: 5  },
  fullscreen_enter:   { severity: 'LOW',    delta: 0  },
  permission_denied:  { severity: 'HIGH',   delta: 10 },
  permission_revoked: { severity: 'HIGH',   delta: 10 },
  network_disconnect: { severity: 'LOW',    delta: 2  },
  network_reconnect:  { severity: 'LOW',    delta: 1  },
  inactivity:         { severity: 'LOW',    delta: 2  },
  tab_switch:         { severity: 'MEDIUM', delta: 5  },
  devtools_open:      { severity: 'HIGH',   delta: 20 },
  right_click:        { severity: 'LOW',    delta: 1  },
};

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface ScoringResult {
  score: number;
  maxScore: number;
  isCorrect: boolean | null; // null for manual
  feedback?: string;
  requiresManualReview: boolean;
}

export type ScoreBand = 'excellent' | 'good' | 'average' | 'poor';

export function getScoreBand(pct: number): ScoreBand {
  if (pct >= 90) return 'excellent';
  if (pct >= 75) return 'good';
  if (pct >= 60) return 'average';
  return 'poor';
}

export const SCORE_BAND_LABELS: Record<ScoreBand, { label: string; color: string; recommendation: string }> = {
  excellent: { label: 'Excellent',      color: 'green',  recommendation: 'Strong Hire'   },
  good:      { label: 'Good',           color: 'blue',   recommendation: 'Hire'           },
  average:   { label: 'Average',        color: 'yellow', recommendation: 'Consider'       },
  poor:      { label: 'Below Standard', color: 'red',    recommendation: 'No Hire'        },
};
