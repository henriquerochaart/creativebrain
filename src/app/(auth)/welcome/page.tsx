import { redirect } from "next/navigation";
import { WelcomeCards } from "@/components/welcome-cards";
import { currentUser, hasOwner, signupsOpen } from "@/server/accounts";

/** First visit while signed out: the welcome cards, then the way in. */
export default async function WelcomePage() {
  if (await currentUser()) redirect("/");
  return <WelcomeCards signup={await signupsOpen()} accounts={await hasOwner()} />;
}
