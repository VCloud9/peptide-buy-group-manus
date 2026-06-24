import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminMembers() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => { toast.success("Role updated."); utils.users.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [search, setSearch] = useState("");

  const filtered = users?.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (u as any).skoolUsername?.toLowerCase().includes(q)
    );
  }) ?? [];

  return (
    <AppLayout showAdmin>
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {users?.length ?? 0} registered members
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, Skool username..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-2">
            <Users size={36} className="mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No members found.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-border">
              {filtered.map((user) => (
                <div key={user.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{user.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email ?? "No email"}
                      {(user as any).skoolUsername && ` · @${(user as any).skoolUsername}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                    <Select
                      value={user.role}
                      onValueChange={(v) => {
                        if (confirm(`Change ${user.name ?? "this user"}'s role to ${v}?`)) {
                          updateRole.mutate({ userId: user.id, role: v as any });
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
