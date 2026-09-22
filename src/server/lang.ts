import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isLang, t, type Lang } from "@/lib/i18n";

/** The reader's language, for server components and route handlers. */
export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

/** Convenience for server components: `const { lang, d } = await dict();` */
export async function dict() {
  const lang = await getLang();
  return { lang, d: t(lang) };
}
