import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Profile() {
  const { data: me, isLoading, refetch } = trpc.users.me.useQuery();
  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => { toast.success("Profile saved."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    name: "",
    skoolUsername: "",
    shippingName: "",
    shippingAddress1: "",
    shippingAddress2: "",
    shippingCity: "",
    shippingState: "",
    shippingZip: "",
    shippingCountry: "US",
  });

  useEffect(() => {
    if (me) {
      setForm({
        name: me.name ?? "",
        skoolUsername: me.skoolUsername ?? "",
        shippingName: me.shippingName ?? "",
        shippingAddress1: me.shippingAddress1 ?? "",
        shippingAddress2: me.shippingAddress2 ?? "",
        shippingCity: me.shippingCity ?? "",
        shippingState: me.shippingState ?? "",
        shippingZip: me.shippingZip ?? "",
        shippingCountry: me.shippingCountry ?? "US",
      });
    }
  }, [me]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = () => updateProfile.mutate(form);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container py-8">
          <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8 max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Profile & Shipping</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Keep your shipping address up to date so admins can ship your order.
          </p>
        </div>

        {/* Account Info */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" value={form.name} onChange={set("name")} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={me?.email ?? ""} disabled className="opacity-60" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="skool">Skool Username</Label>
              <Input id="skool" value={form.skoolUsername} onChange={set("skoolUsername")} placeholder="@yourhandle" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={me?.role ?? "user"} disabled className="opacity-60 capitalize" />
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Shipping Address</h2>
          <p className="text-xs text-muted-foreground">
            This address will be pre-filled when you place orders. You can override it per order.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="shippingName">Full Name / Recipient</Label>
              <Input id="shippingName" value={form.shippingName} onChange={set("shippingName")} placeholder="John Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr1">Address Line 1</Label>
              <Input id="addr1" value={form.shippingAddress1} onChange={set("shippingAddress1")} placeholder="123 Main St" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr2">Address Line 2 (optional)</Label>
              <Input id="addr2" value={form.shippingAddress2} onChange={set("shippingAddress2")} placeholder="Apt 4B" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.shippingCity} onChange={set("shippingCity")} placeholder="New York" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={form.shippingState} onChange={set("shippingState")} placeholder="NY" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" value={form.shippingZip} onChange={set("shippingZip")} placeholder="10001" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={form.shippingCountry} onChange={set("shippingCountry")} placeholder="US" />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateProfile.isPending} className="w-full sm:w-auto">
          {updateProfile.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </AppLayout>
  );
}
