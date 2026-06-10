// Seed idempotente: 48 seleções, 104 jogos e config inicial.
// Rodar com: npm run db:seed
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../index';
import { appConfig, matches, participants, teams } from '../schema';
import { CONFIG_KEYS } from '../../lib/config';
import { TEAMS_PT_BR } from './team-names.pt-BR';
import wc2026 from './wc2026.json';

// Edite esta lista para cadastrar os participantes do bolão (M1; depois vira admin UI)
const PARTICIPANTS: string[] = [];

type SeedMatch = {
  num: number;
  kickoffUtc: string;
  stage: 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL';
  group?: string;
  home?: string;
  away?: string;
  homeSlot?: string;
  awaySlot?: string;
  venue?: string;
};

async function main() {
  const seedMatches = wc2026.matches as SeedMatch[];

  // Grupo de cada seleção, derivado dos jogos da fase de grupos
  const groupByTeam = new Map<string, string>();
  for (const m of seedMatches) {
    if (m.stage !== 'GROUP') continue;
    groupByTeam.set(m.home!, m.group!);
    groupByTeam.set(m.away!, m.group!);
  }
  if (groupByTeam.size !== 48) throw new Error(`Esperava 48 seleções, achei ${groupByTeam.size}`);

  for (const [englishName, group] of groupByTeam) {
    const info = TEAMS_PT_BR[englishName];
    if (!info) throw new Error(`Seleção sem mapeamento pt-BR: ${englishName}`);
    await db
      .insert(teams)
      .values({ fifaCode: info.fifaCode, name: info.name, groupLetter: group, flag: info.flag })
      .onConflictDoUpdate({
        target: teams.fifaCode,
        set: { name: info.name, groupLetter: group, flag: info.flag },
      });
  }
  console.log('✓ 48 seleções');

  const allTeams = await db.select().from(teams);
  const teamIdByEnglish = new Map<string, number>();
  for (const [englishName] of groupByTeam) {
    const code = TEAMS_PT_BR[englishName].fifaCode;
    const team = allTeams.find((t) => t.fifaCode === code);
    if (!team) throw new Error(`Team não encontrado pós-insert: ${code}`);
    teamIdByEnglish.set(englishName, team.id);
  }

  for (const m of seedMatches) {
    const values = {
      id: m.num,
      stage: m.stage,
      groupLetter: m.group ?? null,
      kickoffAt: new Date(m.kickoffUtc),
      homeTeamId: m.home ? teamIdByEnglish.get(m.home)! : null,
      awayTeamId: m.away ? teamIdByEnglish.get(m.away)! : null,
      homeSlot: m.homeSlot ?? null,
      awaySlot: m.awaySlot ?? null,
    };
    // Não sobrescreve placar/status/times já definidos — só dados de calendário
    await db
      .insert(matches)
      .values(values)
      .onConflictDoUpdate({
        target: matches.id,
        set: {
          stage: values.stage,
          groupLetter: values.groupLetter,
          kickoffAt: values.kickoffAt,
          homeSlot: values.homeSlot,
          awaySlot: values.awaySlot,
        },
      });
  }
  console.log(`✓ ${seedMatches.length} jogos`);

  // Prazo da fase de grupos: default = pontapé inicial; não sobrescreve se o admin já mudou
  const match1 = seedMatches.find((m) => m.num === 1)!;
  await db
    .insert(appConfig)
    .values({ key: CONFIG_KEYS.groupStageDeadline, value: new Date(match1.kickoffUtc).toISOString() })
    .onConflictDoNothing();
  await db
    .insert(appConfig)
    .values({ key: CONFIG_KEYS.syncEnabled, value: false })
    .onConflictDoNothing();
  console.log('✓ config (prazo default = kickoff do jogo 1)');

  for (const name of PARTICIPANTS) {
    await db.insert(participants).values({ name }).onConflictDoNothing();
  }
  if (PARTICIPANTS.length) console.log(`✓ ${PARTICIPANTS.length} participantes`);

  const counts = await db.execute(sql`
    select (select count(*) from teams) as teams,
           (select count(*) from matches) as matches,
           (select count(*) from participants) as participants
  `);
  console.log('Estado do banco:', counts.rows[0]);
}

main().then(() => process.exit(0));
