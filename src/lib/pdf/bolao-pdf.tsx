// Documentos PDF do bolão (@react-pdf/renderer) — renderizados só no servidor,
// atrás de /api/pdf/[doc]. Nunca importar em client component (bundle gigante).
import 'server-only';
import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { LeaderboardRow } from '@/lib/scoring/leaderboard';
import type { BetStats } from '@/lib/stats/bets';

// Cores da marca em hex (react-pdf não entende os tokens oklch do Tailwind)
const VERDE = '#009739';
const AMARELO = '#ffd83b';
const AZUL = '#04257c';
const TINTA = '#0a2364';
const BRANCO = '#fffdf5';

let registered = false;
export function registerPdfFonts(origin: string) {
  if (registered) return;
  registered = true;
  Font.register({
    family: 'Passion One',
    src: `${origin}/fonts/PassionOne-Bold.ttf`,
    fontWeight: 700,
  });
  Font.register({
    family: 'Archivo',
    fonts: [
      { src: `${origin}/fonts/Archivo-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/Archivo-Bold.ttf`, fontWeight: 700 },
    ],
  });
  // Bandeiras emoji: twemoji PINADO (jdecked é o fork mantido; @latest é instável)
  Font.registerEmojiSource({
    format: 'png',
    url: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/',
  });
}

export type PdfTeam = { id: number; name: string; flag: string };

export type PdfData = {
  /** data/hora já formatada em pt-BR */
  generatedAt: string;
  participantCount: number;
  rows: LeaderboardRow[];
  stats: BetStats;
  teams: PdfTeam[];
  liveGroupCount: number;
  finishedGroupCount: number;
};

const POS_LABELS = ['1º', '2º', '3º', '4º'];

/** branco → verde conforme o % (heatmap) */
function heatColor(pct: number) {
  const t = Math.min(1, pct / 100);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(mix(0xff, 0x00))}${hex(mix(0xfd, 0x97))}${hex(mix(0xf5, 0x39))}`;
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Archivo',
    fontSize: 9,
    color: TINTA,
    backgroundColor: BRANCO,
    padding: 28,
  },
  pageAmarela: { backgroundColor: AMARELO },
  header: {
    backgroundColor: AZUL,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  headerTitle: { fontFamily: 'Passion One', fontSize: 24, color: AMARELO },
  headerSub: { fontSize: 8, color: BRANCO, opacity: 0.85, marginTop: 2 },
  h2: { fontFamily: 'Passion One', fontSize: 14, color: TINTA, marginBottom: 4 },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: VERDE,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  cardAzul: {
    backgroundColor: AZUL,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#c9cee4',
    paddingVertical: 3,
  },
  rankPos: { width: 24, fontFamily: 'Passion One', fontSize: 11 },
  rankName: { fontWeight: 700, fontSize: 9 },
  rankDetail: { fontSize: 7, color: '#5a629a' },
  rankTotal: {
    backgroundColor: AZUL,
    color: AMARELO,
    fontWeight: 700,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 10,
  },
  destaque: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: VERDE,
    borderRadius: 8,
    padding: 8,
  },
  destaqueLabel: { fontSize: 6.5, color: '#5a629a', textTransform: 'uppercase' },
  destaqueValor: { fontFamily: 'Passion One', fontSize: 13, marginTop: 2 },
  destaqueSub: { fontSize: 7, color: '#5a629a', marginTop: 1 },
  bullet: { fontSize: 8.5, marginBottom: 3, lineHeight: 1.4 },
  bulletBranco: { fontSize: 8.5, marginBottom: 3, lineHeight: 1.4, color: BRANCO },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    textAlign: 'center',
    fontSize: 7,
    color: '#5a629a',
  },
  // heatmap
  matrixCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: VERDE,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  matrixTitle: { fontFamily: 'Passion One', fontSize: 11, marginBottom: 4 },
  matrixHeadCell: { width: 30, fontSize: 6.5, textAlign: 'center', color: '#5a629a' },
  matrixTeam: { flex: 1, fontSize: 7.5, paddingRight: 2 },
  matrixCell: {
    width: 30,
    fontSize: 7.5,
    fontWeight: 700,
    textAlign: 'center',
    borderRadius: 3,
    paddingVertical: 2,
    marginLeft: 1,
  },
  barTrack: {
    width: 70,
    height: 5,
    backgroundColor: '#e4e7f2',
    borderRadius: 3,
    marginLeft: 4,
    marginRight: 4,
  },
  barFill: { height: 5, backgroundColor: VERDE, borderRadius: 3 },
});

function Header({ data, subtitle }: { data: PdfData; subtitle: string }) {
  return (
    <View style={s.header}>
      <Text style={s.headerTitle}>🎠 BOLÃO DO FLYING</Text>
      <Text style={s.headerSub}>
        Copa 2026 · {subtitle} · {data.participantCount} participantes · gerado em{' '}
        {data.generatedAt}
      </Text>
    </View>
  );
}

function Footer() {
  return <Text style={s.footer} fixed>bolao-flying.vercel.app 🎠</Text>;
}

function Ranking({ data, limit }: { data: PdfData; limit?: number }) {
  const rows = limit ? data.rows.slice(0, limit) : data.rows;
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <View>
      {rows.map((r, i) => (
        <View key={r.participantId} style={s.rankRow}>
          <Text style={s.rankPos}>{medals[i] ?? `${i + 1}º`}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.rankName}>{r.name}</Text>
            <Text style={s.rankDetail}>
              grupos {r.groupPoints + r.liveGroupPoints + r.thirdPoints + r.liveThirdPoints} ·
              mata-mata {r.knockoutPoints}
              {r.total !== r.confirmedTotal ? ` · ${r.confirmedTotal} confirmados` : ''}
            </Text>
          </View>
          <Text style={s.rankTotal}>{r.total}</Text>
        </View>
      ))}
    </View>
  );
}

function teamLabel(teams: Map<number, PdfTeam>, teamId: number) {
  const t = teams.get(teamId);
  return t ? `${t.flag} ${t.name}` : '?';
}

function Destaques({ data, teams }: { data: PdfData; teams: Map<number, PdfTeam> }) {
  const { stats } = data;
  const ousado = stats.ousadia[0];
  const careta = stats.ousadia.length > 1 ? stats.ousadia[stats.ousadia.length - 1] : null;
  const discordia = stats.discordia[0];
  const zen = stats.discordia.length > 1 ? stats.discordia[stats.discordia.length - 1] : null;
  const zebra = stats.zebrasNoRadar[0];
  return (
    <View>
      <View style={[s.row, { gap: 8, marginBottom: 8 }]}>
        {ousado && (
          <View style={s.destaque}>
            <Text style={s.destaqueLabel}>🌶️ Mais ousado</Text>
            <Text style={s.destaqueValor}>{ousado.name}</Text>
            <Text style={s.destaqueSub}>{Math.round(ousado.zebraPct)}% contra o consenso</Text>
          </View>
        )}
        {careta && (
          <View style={s.destaque}>
            <Text style={s.destaqueLabel}>🐑 Maria-vai-com-as-outras</Text>
            <Text style={s.destaqueValor}>{careta.name}</Text>
            <Text style={s.destaqueSub}>só {Math.round(careta.zebraPct)}% de zebra</Text>
          </View>
        )}
      </View>
      <View style={[s.row, { gap: 8 }]}>
        {discordia && (
          <View style={s.destaque}>
            <Text style={s.destaqueLabel}>🔥 Grupo da discórdia</Text>
            <Text style={s.destaqueValor}>Grupo {discordia.groupLetter}</Text>
            <Text style={s.destaqueSub}>{discordia.distinctOrders} ordens diferentes</Text>
          </View>
        )}
        {zen && (
          <View style={s.destaque}>
            <Text style={s.destaqueLabel}>🧘 Grupo zen</Text>
            <Text style={s.destaqueValor}>Grupo {zen.groupLetter}</Text>
            <Text style={s.destaqueSub}>{Math.round(zen.topShare)}% apostaram igual</Text>
          </View>
        )}
      </View>
      {zebra && (
        <View style={[s.cardAzul, { marginTop: 8, marginBottom: 0 }]}>
          <Text style={[s.bulletBranco, { marginBottom: 0 }]}>
            🦓 Zebra no radar: {teamLabel(teams, zebra.teamId)} era{' '}
            {POS_LABELS[zebra.consensusPos - 1]} do grupo {zebra.groupLetter} pra{' '}
            {Math.round(zebra.consensusPct)}% do bolão — tá em {POS_LABELS[zebra.livePos - 1]} na
            tabela ao vivo
          </Text>
        </View>
      )}
    </View>
  );
}

function GroupMatrixCard({
  letter,
  data,
  teams,
}: {
  letter: string;
  data: PdfData;
  teams: Map<number, PdfTeam>;
}) {
  const matrix = data.stats.matrices.get(letter);
  if (!matrix) return null;
  return (
    <View style={s.matrixCard} wrap={false}>
      <Text style={s.matrixTitle}>GRUPO {letter}</Text>
      <View style={s.row}>
        <Text style={s.matrixTeam} />
        {POS_LABELS.map((p) => (
          <Text key={p} style={s.matrixHeadCell}>
            {p}
          </Text>
        ))}
      </View>
      {matrix.rows.map((row) => (
        <View key={row.teamId} style={[s.row, { marginTop: 2 }]}>
          <Text style={s.matrixTeam}>{teamLabel(teams, row.teamId)}</Text>
          {row.pct.map((pct, i) => (
            <Text
              key={i}
              style={[
                s.matrixCell,
                { backgroundColor: heatColor(pct), color: pct >= 55 ? BRANCO : TINTA },
              ]}
            >
              {pct > 0 ? `${Math.round(pct)}%` : '–'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function ResumoPdf({ data }: { data: PdfData }) {
  const teams = new Map(data.teams.map((t) => [t.id, t]));
  const { stats } = data;
  return (
    <Document title="Bolão do Flying — Resumo" language="pt-BR">
      <Page size="A4" style={[s.page, s.pageAmarela]}>
        <Header data={data} subtitle="resumo" />

        <View style={s.card}>
          <Text style={s.h2}>🏆 TOP 5 DO RANKING</Text>
          <Ranking data={data} limit={5} />
        </View>

        <Destaques data={data} teams={teams} />

        <View style={[s.card, { marginTop: 8 }]}>
          <Text style={s.h2}>⭐ FAVORITOS DO BOLÃO</Text>
          {stats.favoritos.slice(0, 3).map((f) => (
            <Text key={`${f.groupLetter}-${f.teamId}`} style={s.bullet}>
              {teamLabel(teams, f.teamId)} — {Math.round(f.pct)}% cravam em 1º do grupo{' '}
              {f.groupLetter}
            </Text>
          ))}
          {stats.unanimidades.length > 0 ? (
            <Text style={s.bullet}>
              🤝 {stats.unanimidades.length}{' '}
              {stats.unanimidades.length === 1 ? 'unanimidade' : 'unanimidades'} no bolão
            </Text>
          ) : (
            <Text style={s.bullet}>🤝 Nenhuma unanimidade — bolão rachado!</Text>
          )}
          {stats.contramao[0] && (
            <Text style={[s.bullet, { marginBottom: 0 }]}>
              🫡 Só {stats.contramao[0].participantName} acredita em{' '}
              {teamLabel(teams, stats.contramao[0].teamId)} em 1º do grupo{' '}
              {stats.contramao[0].groupLetter}
            </Text>
          )}
        </View>

        <Footer />
      </Page>
    </Document>
  );
}

export function CompletoPdf({ data }: { data: PdfData }) {
  const teams = new Map(data.teams.map((t) => [t.id, t]));
  const { stats } = data;
  const letters = [...stats.matrices.keys()].sort();
  return (
    <Document title="Bolão do Flying — Estatísticas completas" language="pt-BR">
      <Page size="A4" style={s.page}>
        <Header data={data} subtitle="estatísticas completas" />
        <View style={s.card}>
          <Text style={s.h2}>🏆 RANKING COMPLETO</Text>
          <Ranking data={data} />
        </View>
        <Destaques data={data} teams={teams} />
        <Footer />
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={[s.h2, { fontSize: 16 }]}>O BOLÃO POR POSIÇÃO</Text>
        <Text style={[s.bullet, { color: '#5a629a' }]}>
          % de apostas de cada time em cada posição. Times na ordem do consenso do bolão.
        </Text>
        <View style={[s.row, { flexWrap: 'wrap', justifyContent: 'space-between' }]}>
          {letters.map((letter) => (
            <GroupMatrixCard key={letter} letter={letter} data={data} teams={teams} />
          ))}
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={s.page}>
        {stats.zebrasNoRadar.length > 0 && (
          <View style={s.cardAzul}>
            <Text style={[s.h2, { color: AMARELO }]}>🦓 ZEBRAS NO RADAR</Text>
            {stats.zebrasNoRadar.map((z) => (
              <Text key={`${z.groupLetter}-${z.teamId}`} style={s.bulletBranco}>
                {teamLabel(teams, z.teamId)} era {POS_LABELS[z.consensusPos - 1]} do grupo{' '}
                {z.groupLetter} pra {Math.round(z.consensusPct)}% — tá em{' '}
                {POS_LABELS[z.livePos - 1]} na tabela ao vivo
              </Text>
            ))}
          </View>
        )}

        <View style={s.card}>
          <Text style={s.h2}>🤝 UNANIMIDADES &amp; TEIMOSOS</Text>
          {stats.unanimidades.map((u) => (
            <Text key={`${u.groupLetter}-${u.teamId}-${u.position}`} style={s.bullet}>
              Todo mundo pôs {teamLabel(teams, u.teamId)} em {POS_LABELS[u.position - 1]} do grupo{' '}
              {u.groupLetter}
            </Text>
          ))}
          {stats.unanimidades.length === 0 && (
            <Text style={s.bullet}>Nenhuma unanimidade — bolão dividido até o talo.</Text>
          )}
          {stats.contramao.map((c) => (
            <Text key={`${c.groupLetter}-${c.teamId}`} style={s.bullet}>
              Só {c.participantName} acredita em {teamLabel(teams, c.teamId)} em 1º do grupo{' '}
              {c.groupLetter}
            </Text>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.h2}>🌡️ TERMÔMETRO DA OUSADIA</Text>
          {stats.ousadia.map((o, i) => (
            <View key={o.participantId} style={[s.row, { marginBottom: 3 }]}>
              <Text style={{ width: 14, fontSize: 8 }}>
                {i === 0 ? '🌶️' : i === stats.ousadia.length - 1 ? '🐑' : ' '}
              </Text>
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: 700 }}>{o.name}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${Math.min(100, o.zebraPct)}%` }]} />
              </View>
              <Text style={{ width: 26, fontSize: 8, textAlign: 'right' }}>
                {Math.round(o.zebraPct)}%
              </Text>
            </View>
          ))}
        </View>
        <Footer />
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.card}>
          <Text style={s.h2}>🔍 RAIO-X DOS TERCEIROS</Text>
          <Text style={[s.bullet, { color: '#5a629a' }]}>
            % do bolão que confia no time pra avançar como 3º.
          </Text>
          {stats.terceiros.map((t) => (
            <View key={t.teamId} style={[s.row, { marginBottom: 3 }]}>
              <Text style={{ flex: 1, fontSize: 8.5 }}>{teamLabel(teams, t.teamId)}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${Math.min(100, t.pct)}%` }]} />
              </View>
              <Text style={{ width: 26, fontSize: 8, textAlign: 'right' }}>
                {Math.round(t.pct)}%
              </Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.h2}>🔥 RANKING DA DISCÓRDIA</Text>
          {stats.discordia.map((d, i) => (
            <Text key={d.groupLetter} style={s.bullet}>
              {i === 0 ? '🔥' : i === stats.discordia.length - 1 ? '🧘' : '•'} Grupo{' '}
              {d.groupLetter}: {d.distinctOrders}{' '}
              {d.distinctOrders === 1 ? 'ordenação' : 'ordenações'} diferentes (a mais comum tem{' '}
              {Math.round(d.topShare)}%)
            </Text>
          ))}
        </View>
        <Footer />
      </Page>
    </Document>
  );
}
