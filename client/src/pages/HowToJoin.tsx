import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FlaskConical,
  ShieldCheck,
  Users,
  TrendingDown,
  Package,
  Eye,
  Video,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Truck,
  Wrench,
  BarChart3,
} from "lucide-react";

// ─── Section Components ───────────────────────────────────────────────────────

function SectionHeader({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-12">
      <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-3 px-3 py-1 bg-primary/10 rounded-full">
        {label}
      </span>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  );
}

// ─── Request Access Form ──────────────────────────────────────────────────────

function RequestAccessForm() {
  const [form, setForm] = useState({ name: "", email: "", skoolUsername: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);

  const requestAccess = trpc.membership.requestAccess.useMutation({
    onSuccess: (data) => {
      if (data.alreadySent) { setAlreadySent(true); return; }
      if (data.duplicate) { setDuplicate(true); return; }
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    requestAccess.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      skoolUsername: form.skoolUsername.trim() || undefined,
      message: form.message.trim() || undefined,
    });
  };

  if (alreadySent) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Invite Already Sent</h3>
        <p className="text-muted-foreground">
          Your invite code was already sent to <strong>{form.email}</strong>. Check your email inbox (and spam folder).
          If you need help, reach out in the{" "}
          <a href="https://www.skool.com/peptide-buyer-group" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Skool community
          </a>.
        </p>
      </div>
    );
  }

  if (duplicate) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Request Already Received</h3>
        <p className="text-muted-foreground">
          We already have your request on file. We'll reach out once your membership is approved.
          In the meantime, make sure you've joined the{" "}
          <a href="https://www.skool.com/peptide-buyer-group" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Skool group
          </a>{" "}
          — that's step one.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Request Received</h3>
        <p className="text-muted-foreground mb-4">
          We've received your request and you'll hear back within 24–48 hours. Once approved, you'll receive
          an invite code by email to activate your account.
        </p>
        <p className="text-sm text-muted-foreground">
          While you wait, join the community:{" "}
          <a href="https://www.skool.com/peptide-buyer-group" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
            skool.com/peptide-buyer-group <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="req-name">Full Name <span className="text-destructive">*</span></Label>
          <Input
            id="req-name"
            placeholder="Jane Smith"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="req-email">Email Address <span className="text-destructive">*</span></Label>
          <Input
            id="req-email"
            type="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="req-skool">Skool Username</Label>
        <Input
          id="req-skool"
          placeholder="Your username on skool.com/peptide-buyer-group"
          value={form.skoolUsername}
          onChange={(e) => setForm({ ...form, skoolUsername: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          You must be a member of the Skool group first.{" "}
          <a href="https://www.skool.com/peptide-buyer-group" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Join here
          </a>{" "}
          if you haven't already.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="req-message">Anything else you'd like us to know? <span className="text-muted-foreground text-xs">(optional)</span></Label>
        <Textarea
          id="req-message"
          placeholder="How did you hear about us? Are you a reseller, personal user, etc.?"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={3}
        />
      </div>
      {requestAccess.error && (
        <p className="text-sm text-destructive">{requestAccess.error.message}</p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={requestAccess.isPending}>
        {requestAccess.isPending ? "Submitting..." : "Request Access"}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        We review every request manually. You'll hear back within 24–48 hours.
      </p>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HowToJoin() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Nav ── */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-foreground hover:text-primary transition-colors">
            Peptide Buy Group
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/faq">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">FAQ</Button>
            </Link>
            <a href="https://www.skool.com/peptide-buyer-group" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                Join Skool <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </a>
            <Link href="/">
              <Button size="sm">Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-6 text-primary border-primary/30 bg-primary/5">
              Private Membership Group
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Buy smarter.<br />
              <span className="text-primary">Test everything.</span><br />
              Know what you're getting.
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Peptide Buy Group is a private community that pools purchasing power to access
              wholesale pricing, mandatory batch testing, and full supply chain transparency —
              so you never have to guess what's in the vial.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#request-access">
                <Button size="lg" className="w-full sm:w-auto">
                  Request Access <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </a>
              <a href="https://www.skool.com/peptide-buyer-group" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-background">
                  Join the Skool Community <ExternalLink className="w-4 h-4 ml-1" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why This Matters ── */}
      <section className="py-20 border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeader
            label="The Problem"
            title="The peptide market has a trust problem"
            subtitle="Most vendors self-report purity. A single independent lab test costs up to $300. Most buyers never test. We do."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <FlaskConical className="w-6 h-6" />,
                title: "Batch Testing — Cost Split",
                body: "Every batch we receive is independently tested by a third-party lab. A single sample test costs up to $300. By splitting that cost across the group, each member pays a fraction while getting the same verified result. You see the actual Certificate of Analysis (COA) before anything ships.",
              },
              {
                icon: <ShieldCheck className="w-6 h-6" />,
                title: "Vendor Vetting",
                body: "We don't just pick the cheapest supplier. Every vendor must pass our vetting process and is required to submit their own batch testing documentation before we place an order. We verify their COAs against our independent tests.",
              },
              {
                icon: <Package className="w-6 h-6" />,
                title: "Batch Labeling Required",
                body: "Every box that leaves our hands is batch-labeled. You know exactly which production run your product came from, what it tested at, and when it was tested. No guesswork, no mystery vials.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-20 bg-muted/30 border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeader
            label="Benefits"
            title="What you get as a member"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <TrendingDown className="w-5 h-5" />,
                title: "Volume Pricing",
                body: "Group orders unlock wholesale and bulk pricing that no individual buyer can access. The more members participate, the better the price per unit.",
              },
              {
                icon: <FlaskConical className="w-5 h-5" />,
                title: "Independent Lab Testing",
                body: "Third-party COAs on every batch. You see the actual test results — purity, identity, and concentration — before your order ships.",
              },
              {
                icon: <Eye className="w-5 h-5" />,
                title: "Full Transparency",
                body: "Every buy has a dedicated page showing vendor details, batch info, test results, and real-time shipping status. Nothing is hidden.",
              },
              {
                icon: <Truck className="w-5 h-5" />,
                title: "Real-Time Shipping Updates",
                body: "Tracking numbers are pushed directly to your account and sent via email the moment your order ships. No need to chase updates.",
              },
              {
                icon: <Package className="w-5 h-5" />,
                title: "Beyond Peptides",
                body: "Group buys aren't limited to peptides. We also source injection supplies, pens, vial boxes, and other items operators need — at group pricing.",
              },
              {
                icon: <Wrench className="w-5 h-5" />,
                title: "Operator Resources",
                body: "For resellers and operators: we share ideas on automating your business — websites, ad strategies, and operational workflows — so we can all run better businesses.",
              },
              {
                icon: <Video className="w-5 h-5" />,
                title: "Weekly Zoom Calls",
                body: "Live calls once a week (or as needed) to answer questions, walk through active buys, and give real-time updates. You're never left guessing.",
              },
              {
                icon: <MessageCircle className="w-5 h-5" />,
                title: "Skool Community",
                body: "All discussions, Q&A, and updates happen in our private Skool group. Ask questions, share experiences, and connect with other members.",
              },
              {
                icon: <Users className="w-5 h-5" />,
                title: "Community That Helps Each Other",
                body: "This isn't just a buying club. Members actively help each other with sourcing questions, business advice, and industry knowledge.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 bg-card border border-border rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How to Join ── */}
      <section className="py-20 border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeader
            label="How to Join"
            title="Three steps to get started"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                step: "01",
                title: "Join the Skool Group",
                body: "Membership in our Skool community is the first requirement. This is where all discussions, updates, and Q&A happen. Join at the link below.",
                action: (
                  <a href="https://www.skool.com/peptide-buyer-group" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="mt-3 bg-background">
                      skool.com/peptide-buyer-group <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </a>
                ),
              },
              {
                step: "02",
                title: "Request Platform Access",
                body: "Fill out the short form below with your name, email, and Skool username. We review every request and respond within 24–48 hours.",
                action: (
                  <a href="#request-access">
                    <Button size="sm" className="mt-3">
                      Fill Out the Form Below <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </a>
                ),
              },
              {
                step: "03",
                title: "Activate with Your Invite Code",
                body: "Once approved, you'll receive an invite code by email. Log in to the platform, enter your code, and you're in — ready to join your first group buy.",
                action: null,
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-black text-primary/10 mb-4 leading-none">{item.step}</div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
                {item.action}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Payment Methods ── */}
      <section className="py-12 bg-muted/30 border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-6 bg-card border border-border rounded-xl p-6">
            <BarChart3 className="w-8 h-8 text-primary shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Payment Methods</h3>
              <p className="text-sm text-muted-foreground">
                We accept <strong>Zelle</strong> and <strong>Venmo</strong> for all group buy payments.
                Traditional credit card processors don't work well in this space, so we keep it simple
                with peer-to-peer payments. Payment instructions are sent directly to your account
                once your order is confirmed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 border-b border-border">
        <div className="max-w-3xl mx-auto px-4">
          <SectionHeader
            label="FAQ"
            title="Common questions"
          />
          <Accordion type="single" collapsible className="space-y-2">
            {[
              {
                q: "Why do I need to pay for the Skool group?",
                a: "There's a lot happening behind the scenes that most members don't see. Coordinating group buys involves negotiating with vendors, managing logistics, splitting and repackaging orders, arranging independent lab testing, handling shipping to dozens of individual members, and keeping everyone updated in real time. The Skool membership helps cover the operational costs of running this — it's not just a forum, it's the infrastructure that makes the whole thing work. Think of it as the cost of having a dedicated buying team working on your behalf.",
              },
              {
                q: "How does batch testing work and why does it matter?",
                a: "Before any order ships, we send a sample from the batch to an independent third-party lab. They test for purity, identity, and concentration. A single test costs up to $300 — by splitting that cost across all members in the buy, each person pays a small fraction while getting the same verified result. The Certificate of Analysis (COA) is published on the platform and attached to your order so you always know exactly what you received.",
              },
              {
                q: "What is batch labeling and why is it required?",
                a: "Every box we ship is labeled with the specific production batch it came from. This means if a question ever arises about a product, you can trace it back to the exact batch, the vendor, and the test results. It's a standard practice in pharmaceutical supply chains that most peptide buyers never get — we require it on every order.",
              },
              {
                q: "Do you only buy peptides?",
                a: "No. While peptides are our primary focus, we also organize group buys for items that operators and resellers commonly need: injection supplies, pens, vial boxes, packaging materials, and other consumables. If there's demand for something in the community, we'll look into sourcing it at group pricing.",
              },
              {
                q: "What's in it for resellers and operators?",
                a: "Beyond the pricing and testing benefits, we actively share knowledge on running a better operation. This includes ideas on automating your business (websites, booking systems, CRM), running ads, and building efficient workflows. The community is a place where operators help each other succeed — not just a place to buy product.",
              },
              {
                q: "How are vendors vetted?",
                a: "We don't just pick whoever is cheapest. Every vendor we work with must go through a vetting process that includes reviewing their business history, requesting their own batch documentation, and verifying their COAs against our independent tests. If a vendor's product doesn't match what they claim, we don't use them — and we tell the community why.",
              },
              {
                q: "How do I know what's happening with my order?",
                a: "Your order status is updated in real time on the platform as it moves through each stage: committed, payment confirmed, order placed with supplier, testing in progress, ready to ship, and shipped. When your order ships, you'll receive a tracking number automatically. We also hold weekly Zoom calls and post updates in the Skool community so you're never left in the dark.",
              },
              {
                q: "How do I pay?",
                a: "We accept Zelle and Venmo. Once your order is confirmed and moves to the payment stage, you'll receive payment instructions directly in your account. We don't use traditional credit card processors — they don't work well in this space.",
              },
              {
                q: "What happens after I submit a request?",
                a: "We review every request manually and respond within 24–48 hours. Once approved, you'll receive an invite code by email. You use that code to activate your account on the platform and gain access to all active and upcoming group buys.",
              },
              {
                q: "Is this legal?",
                a: "Peptides sold for research purposes are legal to purchase in the United States. Our group buys are organized for research use. Members are responsible for understanding and complying with the laws in their own jurisdiction.",
              },
              {
                q: "How do I suggest a new product for a future group buy?",
                a: "Post your suggestion in the Skool community group — there's a dedicated discussion thread for product requests. If enough members express interest, we'll evaluate the product category, research potential vendors, and run it through our vetting process before organizing a buy. The more specific you can be (product type, use case, estimated quantity you'd need), the easier it is for us to assess demand and find a qualified supplier. We review all suggestions and will always let the community know if we're moving forward or why we're passing on something.",
              },
            ].map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Request Access Form ── */}
      <section id="request-access" className="py-20 bg-muted/30">
        <div className="max-w-2xl mx-auto px-4">
          <SectionHeader
            label="Get Started"
            title="Request access"
            subtitle="Fill out the form below. We'll review your request and send you an invite code within 24–48 hours."
          />
          <div className="bg-card border border-border rounded-xl p-6 md:p-8">
            <RequestAccessForm />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an invite code?{" "}
            <Link href="/" className="text-primary underline">
              Sign in here
            </Link>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Peptide Buy Group. Private membership community.</span>
          <div className="flex items-center gap-4">
            <a href="https://www.skool.com/peptide-buyer-group" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
              Skool Community <ExternalLink className="w-3 h-3" />
            </a>
            <Link href="/" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
