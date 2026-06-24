import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, ShieldCheck } from "lucide-react";

/**
 * InviteGate wraps any protected page. If the current user has not yet
 * redeemed an invite code, it renders the redemption form instead of children.
 * Admins and owners bypass the gate automatically.
 */
export default function InviteGate({ children }: { children: React.ReactNode }) {
  const { data: status, isLoading, refetch } = trpc.inviteCodes.myStatus.useQuery();
  const redeemMutation = trpc.inviteCodes.redeem.useMutation({
    onSuccess: () => {
      toast.success("Invite code accepted — welcome to Peptide Buy Group!");
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Invalid invite code");
    },
  });

  const [code, setCode] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status?.onboarded) {
    return <>{children}</>;
  }

  // Show invite gate
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src="/manus-storage/pbg-logo_eb506b81.png"
            alt="Peptide Buy Group"
            className="h-12 w-auto"
          />
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <KeyRound size={22} className="text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">Enter Your Invite Code</CardTitle>
            <CardDescription className="text-muted-foreground">
              Peptide Buy Group is a closed community. You need a valid invite code from an admin to
              gain access.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="e.g. ABCD1234"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.trim().length >= 4) {
                    redeemMutation.mutate({ code: code.trim() });
                  }
                }}
                className="text-center tracking-widest text-base font-mono uppercase"
                maxLength={12}
                autoFocus
              />
            </div>

            <Button
              className="w-full"
              onClick={() => redeemMutation.mutate({ code: code.trim() })}
              disabled={code.trim().length < 4 || redeemMutation.isPending}
            >
              {redeemMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck size={16} />
                  Activate Access
                </span>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Don't have a code? Contact an admin in the Skool community.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
