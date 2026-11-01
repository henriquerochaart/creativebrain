import { redirect } from "next/navigation";

/** The old setup page lives in Settings now; keep links and bookmarks working. */
export default function ShareSetupRedirect() {
  // `redirect` from next/navigation applies basePath itself.
  redirect("/settings#instalar");
}
