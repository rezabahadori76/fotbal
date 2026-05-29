import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Users, MessageSquare, ClipboardList, UserPlus } from "lucide-react";

export default async function AdminOverviewPage() {
  const [users, questions, assignments, coachCount, playerCount] = await Promise.all([
    prisma.user.count(),
    prisma.questionTemplate.count({ where: { isActive: true } }),
    prisma.questionAssignment.count(),
    prisma.user.count({ where: { role: "COACH" } }),
    prisma.playerProfile.count(),
  ]);

  const stats = [
    { label: "Total users", value: users, icon: Users },
    { label: "Coaches", value: coachCount, icon: Users },
    { label: "Players", value: playerCount, icon: UserPlus },
    { label: "Questions", value: questions, icon: MessageSquare },
    { label: "Assignments sent", value: assignments, icon: ClipboardList },
  ];

  const actions = [
    {
      href: "/admin/users",
      title: "Manage users",
      description: "Add coaches and players; assign each player to a coach",
    },
    {
      href: "/admin/questions",
      title: "Design questions",
      description: "Create multiple-choice questions for the library",
    },
    {
      href: "/admin/assignments",
      title: "Assign questions",
      description: "Send library or custom questions to players",
    },
    {
      href: "/admin/responses",
      title: "Player responses",
      description: "View each player's answers and outcomes",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin overview</h1>
        <p className="text-muted mt-1">Manage users, questions, and player assignments</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="flex items-start gap-4">
            <span className="rounded-xl bg-pitch/50 p-3 text-accent">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm text-muted">{label}</p>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="h-full transition-colors hover:border-accent/40">
              <h2 className="font-display font-semibold">{action.title}</h2>
              <p className="text-sm text-muted mt-2">{action.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
