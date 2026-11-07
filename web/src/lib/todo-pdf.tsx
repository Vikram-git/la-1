import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { SHOP_NAME } from "@/lib/brand";
import { formatPaise } from "@/lib/money";
import { QUOTATION_COLOURS as ROSE } from "@/lib/quotation";
import { byDate, monthLabel, noteDate, totalPaise, type TodoNote } from "@/lib/todo";
import "@/lib/quotation-pdf";

// A staff member's to-do notes for one month as an A4 PDF, with the same fonts and wordmark as the
// Order in msg: date, bill note and amount, grouped by date.
const wordmark = readFileSync(join(process.cwd(), "public/brand/wordmark.png"));

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontFamily: "Geist", fontSize: 9.5, color: ROSE.ink },
  header: { alignItems: "center", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: ROSE.line },
  title: { fontFamily: "Marcellus", fontSize: 18, color: ROSE.brandStrong, marginTop: 14 },
  sub: { fontSize: 9, color: ROSE.muted, marginTop: 2 },
  thead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: ROSE.brand, paddingBottom: 4, marginTop: 14 },
  th: { fontSize: 7, letterSpacing: 1, color: ROSE.muted, textTransform: "uppercase" },
  row: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: ROSE.line, paddingVertical: 5 },
  colDate: { width: 70 },
  colNote: { flex: 1, paddingRight: 8 },
  colAmount: { width: 80, textAlign: "right" },
  dayTotal: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 3, color: ROSE.muted, fontSize: 8.5 },
  total: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  strong: { fontWeight: 600, fontSize: 11, color: ROSE.brandStrong },
  empty: { marginTop: 16, color: ROSE.muted },
  footer: { position: "absolute", left: 40, right: 40, bottom: 22, fontSize: 7.5, color: ROSE.muted, textAlign: "center" },
});

function TodoPdf({ notes, month, staffName }: { notes: TodoNote[]; month: string; staffName: string }) {
  return (
    <Document title={`To-do list ${monthLabel(month)}`} author={SHOP_NAME} creator={SHOP_NAME} producer={SHOP_NAME}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- a react-pdf Image, which has no alt */}
          <Image src={wordmark} style={{ width: 170, height: 61 }} />
          <Text style={s.title}>To-do list · {monthLabel(month)}</Text>
          <Text style={s.sub}>{staffName}</Text>
        </View>
        {notes.length === 0 ? (
          <Text style={s.empty}>No notes for this month.</Text>
        ) : (
          <>
            <View style={s.thead} fixed>
              <Text style={[s.th, s.colDate]}>Date</Text>
              <Text style={[s.th, s.colNote]}>Bill note</Text>
              <Text style={[s.th, s.colAmount]}>Amount</Text>
            </View>
            {byDate(notes).map((g) => (
              <View key={g.date} wrap={false}>
                {g.notes.map((n, i) => (
                  <View key={n.id} style={s.row}>
                    <Text style={s.colDate}>{i === 0 ? noteDate(n.entry_date) : ""}</Text>
                    <Text style={s.colNote}>{n.bill_note ?? ""}</Text>
                    <Text style={s.colAmount}>{n.price_paise === null ? "" : formatPaise(n.price_paise)}</Text>
                  </View>
                ))}
                {g.notes.length > 1 && g.totalPaise > 0 && (
                  <View style={s.dayTotal}><Text>{noteDate(g.date)}: {formatPaise(g.totalPaise)}</Text></View>
                )}
              </View>
            ))}
            <View style={s.total}>
              <Text style={s.strong}>Total {formatPaise(totalPaise(notes))}</Text>
            </View>
          </>
        )}
        <Text style={s.footer} render={({ pageNumber, totalPages }) => `${SHOP_NAME} · Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export function renderTodoPdf(notes: TodoNote[], month: string, staffName: string): Promise<Buffer> {
  return renderToBuffer(<TodoPdf notes={notes} month={month} staffName={staffName} />);
}
