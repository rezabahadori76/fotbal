import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { roleHomePath } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";
import { BackToPitchIQ } from "@/components/layout/back-to-pitchiq";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.user) redirect(roleHomePath(session.user.role));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-6 left-6">
        <BackToPitchIQ compact />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-pitch text-accent font-display font-bold text-2xl mb-4">
            FA
          </span>
          <h1 className="font-display text-4xl font-bold tracking-wide">Academy Hub</h1>
          <p className="text-muted mt-2 text-sm">
            Sign in to manage your squad, questions, and player feedback
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-muted mt-6">
          Demo: coach@academy.com / player@academy.com / admin@academy.com — password123
        </p>
      </div>
    </div>
  );
}
