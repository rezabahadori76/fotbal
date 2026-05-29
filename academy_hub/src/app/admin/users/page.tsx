import Link from "next/link";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { AssignPlayerCoachSelect } from "@/components/admin/assign-player-coach-select";

const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: "Admin",
  [Role.COACH]: "Coach",
  [Role.PLAYER]: "Player",
};

export default async function AdminUsersPage() {
  const [users, coaches] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        playerProfile: { include: { coach: { select: { id: true, name: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { role: Role.COACH },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide">Users</h1>
        <p className="text-muted mt-1">
          Add coaches and players, assign each player to a coach, then send questions from{" "}
          <Link href="/admin/assignments" className="text-accent hover:underline">
            Assign questions
          </Link>
        </p>
      </div>

      <CreateUserForm coaches={coaches} />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border text-left text-muted">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Coach</th>
                <th className="px-6 py-3 font-medium">Details</th>
                <th className="px-6 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-card-border/50 last:border-0">
                  <td className="px-6 py-4 font-medium">{user.name}</td>
                  <td className="px-6 py-4 text-muted">{user.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant="muted">{roleLabels[user.role]}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    {user.playerProfile && coaches.length > 0 ? (
                      <AssignPlayerCoachSelect
                        playerProfileId={user.playerProfile.id}
                        currentCoachId={user.playerProfile.coach.id}
                        coaches={coaches}
                      />
                    ) : user.role === Role.PLAYER ? (
                      <span className="text-xs text-danger">No coach assigned</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted text-xs">
                    {user.playerProfile
                      ? `${user.playerProfile.position ?? "—"} · Squad ${user.playerProfile.squad ?? "—"}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <DeleteUserButton userId={user.id} email={user.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
