import "server-only";
import { join } from "node:path";
import { Circle, Document, Font, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { LOGO_PATHS } from "@/components/ui";
import { QUOTATION_COLOURS as ROSE, type QuotationView } from "@/lib/quotation";

// The quotation as an A4 PDF, drawn by @react-pdf/renderer: plain JavaScript, no headless browser, so it
// runs in a normal Vercel function. Fonts are embedded from assets/fonts (traced in next.config.ts).
// Playfair Display has no ₹ sign, so amounts use Geist (the app's body font).
const fontDir = join(process.cwd(), "assets/fonts");
Font.register({
  family: "Playfair Display",
  fonts: [
    { src: join(fontDir, "playfair-display-latin-400-normal.woff"), fontWeight: 400 },
    { src: join(fontDir, "playfair-display-latin-600-normal.woff"), fontWeight: 600 },
    { src: join(fontDir, "playfair-display-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
  ],
});
Font.register({
  family: "Geist",
  fonts: [
    { src: join(fontDir, "geist-sans-latin-400-normal.woff"), fontWeight: 400 },
    { src: join(fontDir, "geist-sans-latin-500-normal.woff"), fontWeight: 500 },
    { src: join(fontDir, "geist-sans-latin-600-normal.woff"), fontWeight: 600 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 44, fontFamily: "Geist", fontSize: 10, color: ROSE.ink, backgroundColor: "#ffffff" },
  header: { alignItems: "center", paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: ROSE.line },
  shop: { fontFamily: "Playfair Display", fontSize: 24, marginTop: 8 },
  cityRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  cityRule: { width: 26, height: 0.6, backgroundColor: ROSE.gold },
  city: { fontSize: 7.5, letterSpacing: 3.2, color: ROSE.gold, marginHorizontal: 8 },
  contact: { fontSize: 8, color: ROSE.muted, marginTop: 6 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 18 },
  title: { fontFamily: "Playfair Display", fontWeight: 600, fontSize: 20, color: ROSE.brandStrong },
  facts: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: ROSE.canvas },
  fact: { width: "50%", paddingVertical: 4, paddingRight: 8 },
  label: { fontSize: 7, letterSpacing: 1, color: ROSE.muted, textTransform: "uppercase" },
  value: { fontSize: 10, fontWeight: 500, marginTop: 2 },
  h2: { fontFamily: "Playfair Display", fontWeight: 600, fontSize: 13, marginTop: 18, marginBottom: 6 },
  cakeRow: { flexDirection: "row", paddingVertical: 2 },
  cakeLabel: { width: 110, color: ROSE.muted },
  cakeValue: { flex: 1 },
  wording: { fontFamily: "Playfair Display", fontStyle: "italic", fontSize: 11 },
  thead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: ROSE.brand, paddingBottom: 4 },
  th: { fontSize: 7, letterSpacing: 1, color: ROSE.muted, textTransform: "uppercase" },
  row: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: ROSE.line, paddingVertical: 6 },
  colItem: { flex: 1, paddingRight: 8 },
  colQty: { width: 34, textAlign: "right" },
  colRate: { width: 74, textAlign: "right" },
  colAmt: { width: 80, textAlign: "right" },
  itemTitle: { fontWeight: 500 },
  itemDetail: { fontSize: 8, color: ROSE.muted, marginTop: 1 },
  totals: { marginTop: 8, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  strong: { fontWeight: 600, fontSize: 11.5, color: ROSE.brandStrong },
  note: { marginTop: 4 },
  footer: { position: "absolute", left: 44, right: 44, bottom: 24, borderTopWidth: 0.6, borderTopColor: ROSE.line, paddingTop: 8, alignItems: "center" },
  thanks: { fontFamily: "Playfair Display", fontStyle: "italic", fontSize: 10, color: ROSE.brandStrong },
});

// react-pdf paints gradients only as fills, so the strokes use the rose-gold midtone.
const ROSE_GOLD = "#c7837a";

function Logo() {
  return (
    <Svg viewBox="0 0 64 64" width={46} height={46}>
      <Circle cx="32" cy="32" r="31" fill="#fffafb" />
      <Path d={LOGO_PATHS.ring} stroke={ROSE_GOLD} strokeWidth={1.6} fill="none" />
      <Path d={LOGO_PATHS.innerRing} stroke={ROSE_GOLD} strokeWidth={0.6} fill="none" opacity={0.7} />
      <Path d={LOGO_PATHS.l} stroke={ROSE.brand} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={LOGO_PATHS.p} stroke={ROSE.brand} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={LOGO_PATHS.sparkle} fill="#e7b99a" />
    </Svg>
  );
}

function QuotationPdf({ view }: { view: QuotationView }) {
  return (
    <Document title={`${view.title} ${view.facts[0]?.value ?? ""}`.trim()} author={view.shopName} creator={view.shopName} producer={view.shopName}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Logo />
          <Text style={s.shop}>{view.shopName}</Text>
          <View style={s.cityRow}>
            <View style={s.cityRule} />
            <Text style={s.city}>MADRAS</Text>
            <View style={s.cityRule} />
          </View>
          {view.shopContact.length > 0 && <Text style={s.contact}>{view.shopContact.join("  ·  ")}</Text>}
        </View>

        <View style={s.titleRow}>
          <Text style={s.title}>{view.title}</Text>
        </View>

        <View style={s.facts}>
          {view.facts.map((f) => (
            <View key={f.label} style={s.fact}>
              <Text style={s.label}>{f.label}</Text>
              <Text style={s.value}>{f.value}</Text>
            </View>
          ))}
        </View>

        {view.cake.length > 0 && (
          <View wrap={false}>
            <Text style={s.h2}>Custom cake</Text>
            {view.cake.map((r) => (
              <View key={r.label} style={s.cakeRow}>
                <Text style={s.cakeLabel}>{r.label}</Text>
                <Text style={r.label === "Message on cake" ? [s.cakeValue, s.wording] : s.cakeValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.h2}>Items</Text>
        <View style={s.thead}>
          <Text style={[s.th, s.colItem]}>Item</Text>
          <Text style={[s.th, s.colQty]}>Qty</Text>
          {view.priced && <Text style={[s.th, s.colRate]}>Rate</Text>}
          {view.priced && <Text style={[s.th, s.colAmt]}>Amount</Text>}
        </View>
        {view.lines.map((l) => (
          <View key={l.key} style={s.row} wrap={false}>
            <View style={s.colItem}>
              <Text style={s.itemTitle}>{l.title}</Text>
              {l.detail && <Text style={s.itemDetail}>{l.detail}</Text>}
            </View>
            <Text style={s.colQty}>{l.quantity}</Text>
            {view.priced && <Text style={s.colRate}>{l.unit}</Text>}
            {view.priced && <Text style={s.colAmt}>{l.total}</Text>}
          </View>
        ))}

        {view.totals.length > 0 && (
          <View style={s.totals} wrap={false}>
            {view.totals.map((t) => (
              <View key={t.label} style={s.totalRow}>
                <Text style={t.strong ? s.strong : undefined}>{t.label}</Text>
                <Text style={t.strong ? s.strong : undefined}>{t.value}</Text>
              </View>
            ))}
          </View>
        )}

        {view.notes.map((n) => (
          <Text key={n.label} style={s.note}>
            <Text style={{ color: ROSE.muted }}>{n.label}: </Text>
            {n.value}
          </Text>
        ))}

        <View style={s.footer} fixed>
          <Text style={s.thanks}>Thank you for choosing {view.shopName}</Text>
        </View>
      </Page>
    </Document>
  );
}

export function renderQuotationPdf(view: QuotationView): Promise<Buffer> {
  return renderToBuffer(<QuotationPdf view={view} />);
}
