import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  buildReport,
  dayShort,
  deltaLabel,
  fmtDur,
  monthLabel,
  parseYmd,
  pctLabel,
  shiftPeriod,
  todayStr,
  type Category,
  type ReportKind,
  type Task,
} from "@naal/shared";
import { tint, useTheme } from "../lib/theme";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (s: string) => `${parseYmd(s).getDate()} ${MON[parseYmd(s).getMonth()]}`;

export default function Report({
  tasks,
  categories,
  onClose,
  onPickDay,
}: {
  tasks: Task[];
  categories: Category[];
  onClose: () => void;
  onPickDay: (d: string) => void;
}) {
  const c = useTheme();
  const [kind, setKind] = useState<ReportKind>("week");
  const [anchor, setAnchor] = useState(todayStr());
  const r = useMemo(() => buildReport(tasks, kind, anchor, categories), [tasks, kind, anchor, categories]);
  const prev = useMemo(() => buildReport(tasks, kind, shiftPeriod(kind, anchor, -1), categories), [tasks, kind, anchor, categories]);
  const delta = deltaLabel(r.pct, prev.pct);
  const title = kind === "week" ? `${short(r.start)} – ${short(r.end)}` : monthLabel(anchor);
  const totalMin = r.byCategory.reduce((n, x) => n + x.minutes, 0);
  const card = [s.card, { backgroundColor: c.surface, borderColor: c.line }];
  const Bar = ({ value, color }: { value: number; color?: string }) => (
    <View style={[s.barH, { backgroundColor: c.line }]}>
      <View style={{ width: `${value * 100}%`, height: "100%", backgroundColor: color ?? c.accent, borderRadius: 4 }} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={s.head}>
        <Text style={[s.title, { color: c.ink }]}>{kind === "week" ? "Weekly" : "Monthly"} report</Text>
        <Pressable onPress={onClose} style={[s.chip, { borderColor: c.line, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", gap: 2 }]}>
          <Ionicons name="chevron-back" size={16} color={c.ink} />
          <Text style={{ color: c.ink, fontWeight: "600" }}>Planner</Text>
        </Pressable>
      </View>
      <View style={s.head}>
        <View style={[s.seg, { backgroundColor: c.line }]}>
          {(["week", "month"] as const).map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[s.segBtn, kind === k && { backgroundColor: c.surface }]}>
              <Text style={{ color: kind === k ? c.ink : c.muted, fontWeight: "700" }}>{k === "week" ? "Week" : "Month"}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.nav}>
          <Pressable onPress={() => setAnchor(shiftPeriod(kind, anchor, -1))} style={s.navBtn}><Ionicons name="chevron-back" size={20} color={c.ink} /></Pressable>
          <Text style={{ color: c.ink, fontWeight: "700", minWidth: 96, textAlign: "center" }}>{title}</Text>
          <Pressable onPress={() => setAnchor(shiftPeriod(kind, anchor, 1))} style={s.navBtn}><Ionicons name="chevron-forward" size={20} color={c.ink} /></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}>
        {r.planned === 0 && r.upcoming === 0 ? (
          <Text style={{ color: c.muted, textAlign: "center", marginTop: 40 }}>Nothing was planned in this {kind}.</Text>
        ) : (
          <>
            <View style={card}>
              <View style={s.statsGrid}>
                {[
                  [pctLabel(r.pct), "complete"],
                  [`${r.done}/${r.planned}`, "tasks done"],
                  [fmtDur(r.doneMin), `of ${fmtDur(r.plannedMin)} planned`],
                  [`${r.streak}🔥`, `streak · best ${r.longestStreak}`],
                  [delta ?? "–", `vs last ${kind}`],
                ].map(([big, small]) => (
                  <View key={small} style={s.stat}>
                    <Text style={[s.statBig, { color: c.ink }]}>{big}</Text>
                    <Text style={{ color: c.muted, fontSize: 12 }}>{small}</Text>
                  </View>
                ))}
              </View>
              <Bar value={r.pct ?? 0} />
            </View>

            <View style={card}>
              <Text style={[s.h2, { color: c.ink }]}>{kind === "week" ? "Daily completion" : "Calendar heatmap"}</Text>
              {kind === "week" ? (
                <View style={s.bars}>
                  {r.days.map((d) => (
                    <Pressable key={d.date} style={s.barCol} onPress={() => onPickDay(d.date)}>
                      <View style={[s.barTrack, { backgroundColor: c.line }]}>
                        <View
                          style={{
                            height: `${Math.max(d.pct ?? 0, d.planned ? 0.04 : 0) * 100}%`,
                            backgroundColor: c.accent,
                            opacity: d.future ? 0.3 : 1,
                            borderRadius: 8,
                          }}
                        />
                      </View>
                      <Text style={{ color: c.ink, fontSize: 12, fontWeight: "700" }}>{dayShort(d.date).slice(0, 1)}</Text>
                      <Text style={{ color: c.muted, fontSize: 11 }}>{d.planned ? `${d.done}/${d.planned}` : "·"}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <>
                  <View style={s.heat}>
                    {Array.from({ length: (parseYmd(r.start).getDay() + 6) % 7 }).map((_, i) => (
                      <View key={`pad${i}`} style={s.heatCell} />
                    ))}
                    {r.days.map((d) => (
                      <Pressable
                        key={d.date}
                        onPress={() => onPickDay(d.date)}
                        style={[
                          s.heatCell,
                          { backgroundColor: d.pct === null ? c.line : tint(c.accent, 0.2 + d.pct * 0.8), opacity: d.future ? 0.4 : 1 },
                        ]}
                      >
                        <Text style={{ color: c.ink, fontSize: 11 }}>{parseYmd(d.date).getDate()}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{ color: c.muted, fontSize: 12, fontWeight: "700" }}>Week by week</Text>
                  {r.weeks.map((w) => (
                    <View key={w.start} style={s.row}>
                      <Text style={[s.small, { color: c.ink, width: 54 }]}>{short(w.start)}</Text>
                      <Bar value={w.pct ?? 0} />
                      <Text style={[s.small, { color: c.ink, width: 40, textAlign: "right" }]}>{pctLabel(w.pct)}</Text>
                    </View>
                  ))}
                </>
              )}
              {r.bestDay && (
                <Text style={{ color: c.muted, fontSize: 12 }}>
                  Best day: {short(r.bestDay.date)} ({r.bestDay.done}/{r.bestDay.planned})
                </Text>
              )}
            </View>

            {r.byTask.length > 0 && (
              <View style={card}>
                <Text style={[s.h2, { color: c.ink }]}>Tasks & habits</Text>
                {r.byTask.map((t) => (
                  <View key={t.key} style={s.row}>
                    <View style={[s.mini, { backgroundColor: tint(t.color, 0.25) }]}><Text>{t.emoji}</Text></View>
                    <Text numberOfLines={1} style={{ color: c.ink, fontWeight: "700", width: "32%" }}>{t.title}</Text>
                    <Bar value={t.done / t.planned} color={t.color} />
                    <Text style={[s.small, { color: c.ink }]}>{t.done}/{t.planned}</Text>
                  </View>
                ))}
              </View>
            )}

            {totalMin > 0 && (
              <View style={card}>
                <Text style={[s.h2, { color: c.ink }]}>Time split</Text>
                <View style={s.split}>
                  {r.byCategory.map((x) => (
                    <View key={x.id} style={{ flexGrow: x.minutes, backgroundColor: x.color }} />
                  ))}
                </View>
                {r.byCategory.map((x) => (
                  <View key={x.id} style={s.row}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: x.color }} />
                    <Text style={[s.small, { color: c.ink, flex: 1 }]}>{x.name}</Text>
                    <Text style={[s.small, { color: c.ink }]}>
                      {fmtDur(x.minutes)} · {Math.round((x.minutes / totalMin) * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {r.missed.length > 0 && (
              <View style={card}>
                <Text style={[s.h2, { color: c.ink }]}>Missed</Text>
                {r.missed.map((m) => (
                  <View key={m.task.id + m.date} style={s.row}>
                    <View style={[s.mini, { backgroundColor: tint(m.task.color, 0.25) }]}><Text>{m.task.emoji}</Text></View>
                    <Text numberOfLines={1} style={{ color: c.ink, fontWeight: "700", flex: 1 }}>{m.task.title}</Text>
                    <Pressable onPress={() => onPickDay(m.date)} style={[s.chip, { borderColor: c.line }]}>
                      <Text style={{ color: c.ink, fontSize: 12 }}>{short(m.date)}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 10 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  seg: { flexDirection: "row", borderRadius: 999, padding: 3 },
  segBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  nav: { flexDirection: "row", alignItems: "center" },
  navBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  navTxt: { fontSize: 24, lineHeight: 26 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  h2: { fontSize: 15, fontWeight: "800" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  stat: { width: "50%" },
  statBig: { fontSize: 22, fontWeight: "800" },
  bars: { flexDirection: "row", gap: 6, height: 150 },
  barCol: { flex: 1, alignItems: "center", gap: 3 },
  barTrack: { flex: 1, width: "100%", maxWidth: 34, borderRadius: 8, justifyContent: "flex-end", overflow: "hidden" },
  heat: { flexDirection: "row", flexWrap: "wrap" },
  heatCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  small: { fontSize: 12 },
  barH: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  mini: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  split: { flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", gap: 2 },
});
