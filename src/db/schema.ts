import {
  boolean,
  char,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

export const stageEnum = pgEnum('stage', [
  'GROUP',
  'R32',
  'R16',
  'QF',
  'SF',
  'THIRD',
  'FINAL',
]);

export const matchStatusEnum = pgEnum('match_status', ['SCHEDULED', 'FINISHED']);

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  fifaCode: varchar('fifa_code', { length: 3 }).notNull().unique(),
  name: text('name').notNull(),
  groupLetter: char('group_letter', { length: 1 }).notNull(),
  flag: text('flag').notNull(),
});

export const participants = pgTable('participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  // 1:1 com o user do Better Auth; criado no primeiro acesso pós-login
  userId: text('user_id')
    .unique()
    .references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable('matches', {
  // Número oficial FIFA do jogo (1..104)
  id: integer('id').primaryKey(),
  stage: stageEnum('stage').notNull(),
  groupLetter: char('group_letter', { length: 1 }),
  kickoffAt: timestamp('kickoff_at', { withTimezone: true }).notNull(),
  homeTeamId: integer('home_team_id').references(() => teams.id),
  awayTeamId: integer('away_team_id').references(() => teams.id),
  // Slot codes do mata-mata: '1A', '2C', '3ABCDF', 'W74' — rótulo enquanto TBD
  homeSlot: text('home_slot'),
  awaySlot: text('away_slot'),
  status: matchStatusEnum('status').notNull().default('SCHEDULED'),
  // Mata-mata: placar APÓS prorrogação (antes dos pênaltis)
  homeScore: smallint('home_score'),
  awayScore: smallint('away_score'),
  penaltyWinnerTeamId: integer('penalty_winner_team_id').references(() => teams.id),
  externalId: text('external_id').unique(),
  // Quando true, o sync automático nunca sobrescreve este resultado
  resultLockedByAdmin: boolean('result_locked_by_admin').notNull().default(false),
});

export const groupPredictions = pgTable(
  'group_predictions',
  {
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    groupLetter: char('group_letter', { length: 1 }).notNull(),
    position: smallint('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.participantId, t.teamId] }),
    unique().on(t.participantId, t.groupLetter, t.position),
  ],
);

export const thirdPlacePicks = pgTable(
  'third_place_picks',
  {
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
  },
  (t) => [primaryKey({ columns: [t.participantId, t.teamId] })],
);

export const knockoutPredictions = pgTable(
  'knockout_predictions',
  {
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id),
    homeScore: smallint('home_score').notNull(),
    awayScore: smallint('away_score').notNull(),
    // Obrigatório quando homeScore === awayScore (validado na action)
    penaltyWinnerTeamId: integer('penalty_winner_team_id').references(() => teams.id),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.participantId, t.matchId] })],
);

export const appConfig = pgTable('app_config', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});

export type Team = typeof teams.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type GroupPrediction = typeof groupPredictions.$inferSelect;
export type ThirdPlacePick = typeof thirdPlacePicks.$inferSelect;
export type KnockoutPrediction = typeof knockoutPredictions.$inferSelect;
