// La Patisserie Madras brand (owner, 2026-10-28). Pure: imported by unit tests and server renderers.
export const SHOP_NAME = "La Patisserie Madras";

// The one address shown on the bill and the "Order in msg" file and text; bills print it line by line.
export const SHOP_ADDRESS_LINES = [
  "Bharath Nagar Extn, 7, Water Canal Rd,",
  "Near Alliance Orchid Springs Apartment,",
  "Korattur, Chennai,",
  "Tamil Nadu 600099",
] as const;
export const SHOP_ADDRESS =
  "Bharath Nagar Extn, 7, Water Canal Rd, near Alliance Orchid Springs Apartment, Korattur, Chennai, Tamil Nadu 600099";
// Colours from the logo and the icing-drip image, for renderers that cannot read CSS variables.
export const BRAND_COLOURS = { ink: "#111111", pink: "#E8838A", teal: "#26C6BC", chocolate: "#4A2418", cream: "#F7F3EE" } as const;

export const LOGO_SRC = "/brand/logo-round.png";

// Shared by the calendar's "Terms and Conditions" button (WhatsApp).
export const PAYMENT_TERMS = [
  "Payment Terms",
  "- Dates and time slots are reserved only after payment is received.",
  "- Kindly mention your event date and the baby's name in the GPay payment note to help identify.",
  "- Making the payment promptly will help us avoid any delay in dispatching the cake.",
  "- 100% advance payment is required before the event / delivery. The cake can only be sent once the pending payment has been received.",
  "- No cash payments accepted. Only GPay.",
].join("\n");

// The short version printed on cake sheets.
export const CAKE_SHEET_TERMS = [
  "Dates and time slots are reserved only after payment is received.",
  "100% advance payment before the event / delivery.",
  "GPay only. No cash.",
  "Mention the event date and the baby's name in the GPay note.",
];
