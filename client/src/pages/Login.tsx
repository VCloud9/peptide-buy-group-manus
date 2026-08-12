import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

function getSafeRedirectPath() {
  const redirectTo = new URLSearchParams(window.location.search).get("redirectTo");
  return redirectTo?.startsWith("/") ? redirectTo : "/dashboard";
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectPath = useMemo(getSafeRedirectPath, []);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) setLocation(redirectPath);
      },
    );

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLocation(redirectPath);
    });

    return () => subscription.subscription.unsubscribe();
  }, [redirectPath, setLocation]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });

    setIsSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-[#070f16] px-4 py-12 text-slate-100">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="mb-9 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-teal-300">
          <ArrowLeft size={16} /> Back to Peptide Buy Group
        </Link>
        <section className="rounded-2xl border border-teal-900/40 bg-slate-950/70 p-7 shadow-2xl shadow-black/30">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
            {sent ? <CheckCircle2 size={24} /> : <Mail size={23} />}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{sent ? "Check your inbox" : "Sign in"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {sent
              ? "We sent a secure sign-in link to your email address. Open it in this browser to continue."
              : "Use the email associated with your Peptide Buy Group membership. We’ll send a secure sign-in link."}
          </p>

          {!sent && (
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <Button className="w-full bg-teal-500 text-slate-950 hover:bg-teal-400" disabled={isSubmitting} type="submit">
                {isSubmitting ? <Loader2 className="animate-spin" size={17} /> : "Email me a sign-in link"}
              </Button>
            </form>
          )}

          {sent && (
            <Button className="mt-7 w-full" variant="outline" onClick={() => setSent(false)}>
              Use a different email
            </Button>
          )}
        </section>
      </div>
    </main>
  );
}
