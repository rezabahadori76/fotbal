import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import { getSession } from "@/lib/session";
import { roleHomePath } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  redirect(roleHomePath(session.user.role));
}
