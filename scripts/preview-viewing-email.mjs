import { writeFileSync } from "node:fs";
import { buildViewingMessage } from "../server/viewingReady.js";

const message = buildViewingMessage({ client_name: "Gabrielle", email: "client@example.com",
  booking_reference: "AB-M-S-261003-3815", client_drive_folder_url: "https://drive.google.com/drive/folders/example" });
writeFileSync(new URL("../docs/viewing-ready-email-preview.html", import.meta.url),
  message.html.replaceAll("{{FREE_UNTIL}}", "November 2, 2026"));
