import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Search,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  ShieldCheck,
  Users,
  Package,
  CreditCard,
  HelpCircle,
  Star,
  MessageCircle,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

const categories = [
  {
    id: "about",
    label: "About PBG",
    icon: <Star size={16} />,
    color: "text-accent",
  },
  {
    id: "safety",
    label: "Safety & Testing",
    icon: <FlaskConical size={16} />,
    color: "text-green-400",
  },
  {
    id: "process",
    label: "How It Works",
    icon: <Package size={16} />,
    color: "text-primary",
  },
  {
    id: "membership",
    label: "Membership",
    icon: <Users size={16} />,
    color: "text-purple-400",
  },
  {
    id: "payment",
    label: "Payment",
    icon: <CreditCard size={16} />,
    color: "text-yellow-400",
  },
  {
    id: "beyond",
    label: "Beyond Peptides",
    icon: <ShieldCheck size={16} />,
    color: "text-blue-400",
  },
  {
    id: "transparency",
    label: "Transparency",
    icon: <MessageCircle size={16} />,
    color: "text-pink-400",
  },
  {
    id: "founder",
    label: "Founder Background",
    icon: <HelpCircle size={16} />,
    color: "text-orange-400",
  },
];

const faqs: { id: string; category: string; question: string; answer: string }[] = [
  // ── About PBG ──────────────────────────────────────────────────────────────
  {
    id: "what-is-pbg",
    category: "about",
    question: "What is Peptide Buy Group?",
    answer:
      "Peptide Buy Group (PBG) is a private, invite-only group buying platform for the peptide research community. Members pool their purchasing power to access manufacturer-direct pricing, share the cost of independent third-party lab testing, and receive batch-labeled, independently verified product — all tracked through a single platform from commitment to delivery.",
  },
  {
    id: "who-runs-this",
    category: "about",
    question: "Who runs this?",
    answer:
      "PBG is founded and operated by Ray Collazo, a veteran of large-scale international group buying and import operations. Ray has been organizing group buys since the early days of the e-cigarette market, when products were only available directly from Chinese manufacturers. He has since applied the same processes to electronics, hardware, kitchen knives, motorcycles, and during the COVID-19 pandemic, critical PPE including nitrile gloves, gowns, and disinfectants — sourced directly from factories in China and Vietnam when global supply chains had collapsed. The PBG team has made in-person factory visits to China, Vietnam, and Malaysia to vet suppliers, inspect quality controls, and build direct relationships in key manufacturing districts. Collectively, the team has facilitated tens of millions of dollars in imports with a documented track record of delivery and quality.",
  },
  {
    id: "why-trust",
    category: "about",
    question: "Why should I trust this operation?",
    answer:
      "Trust is built on track record, transparency, and accountability. Ray and the PBG team have been doing this since before most of the current peptide market existed. The same operational discipline — vendor vetting, factory visits, batch verification, and community accountability — that was applied to PPE imports during the pandemic is applied here. Every buy is documented, every test result is published, and every member is a known, verified participant in the Skool community. There are no anonymous transactions.",
  },
  {
    id: "is-it-legal",
    category: "about",
    question: "Is this legal?",
    answer:
      "Peptides sold through PBG are research-grade compounds intended for laboratory and research purposes only. They are not sold for human consumption, therapeutic use, or as dietary supplements. Members are responsible for understanding and complying with the laws and regulations applicable in their jurisdiction. PBG does not provide medical advice.",
  },

  // ── Safety & Testing ───────────────────────────────────────────────────────
  {
    id: "batch-testing",
    category: "safety",
    question: "How does batch testing work?",
    answer:
      "Every batch purchased through PBG is sent to Freedom Diagnostics — an independent third-party laboratory — for analysis using HPLC (High-Performance Liquid Chromatography) and LC-MS (Liquid Chromatography–Mass Spectrometry). These are the gold-standard methods for verifying peptide identity and purity. The cost of testing is split across all participating members. A single independent test can cost up to $300; when split across dozens of members, the per-person cost becomes negligible.",
  },
  {
    id: "what-is-coa",
    category: "safety",
    question: "What is a Certificate of Analysis (COA)?",
    answer:
      "A COA is the official lab report issued by Freedom Diagnostics after testing a batch. It documents the compound tested, the testing methods used, the purity percentage, and any detected impurities. PBG publishes the full COA PDF for every batch to all participating members through the platform before any product ships. Members can download and verify the results themselves.",
  },
  {
    id: "batch-labeling",
    category: "safety",
    question: "What is batch labeling and why does it matter?",
    answer:
      "Every box shipped through PBG carries a batch label identifying the product, the lot number, the testing date, and the COA reference. This creates a direct, traceable link between what you receive and the lab report that verified it. In a market where mislabeling and substitution are common risks, batch labeling is a non-negotiable standard at PBG.",
  },
  {
    id: "vendor-vetting",
    category: "safety",
    question: "How are vendors vetted?",
    answer:
      "Vendors must meet a multi-step vetting process before being approved for a PBG group buy. This includes background research on the vendor's history and reputation in the community, direct communication and relationship building, a requirement to submit their own internal batch testing documentation, and in many cases, direct factory visits by the PBG team. PBG's existing relationships in China's key manufacturing districts — built over years of direct import operations — give the team direct access to verified, accountable suppliers. Vendors who cannot or will not meet these standards are not used.",
  },
  {
    id: "failed-test",
    category: "safety",
    question: "What happens if a batch fails testing?",
    answer:
      "If a batch does not meet purity standards or fails identity verification, PBG will not distribute it. Members will be notified, the buy will be halted or the vendor will be required to replace the batch, and the failed COA will be published so the community is informed. The vendor will be reviewed for continued participation.",
  },
  {
    id: "test-every-product",
    category: "safety",
    question: "Do you test every product in every buy?",
    answer:
      "Yes. Every product in every group buy is independently tested before distribution. There are no exceptions. This is a core, non-negotiable requirement of the PBG process.",
  },
  {
    id: "coa-real",
    category: "safety",
    question: "How do I know the COA is real and not fabricated?",
    answer:
      "COAs are issued directly by Freedom Diagnostics, an independent laboratory with no financial relationship to PBG or its vendors. The COA includes the lab's contact information, accreditation details, and the specific sample identifiers. Members are encouraged to contact Freedom Diagnostics directly to verify any COA if they have concerns.",
  },

  // ── How It Works ──────────────────────────────────────────────────────────
  {
    id: "how-it-works",
    category: "process",
    question: "How does a group buy work, step by step?",
    answer:
      "A group buy begins when PBG identifies a product and a vetted vendor. The buy is opened on the platform with a target minimum order quantity (MOQ), a price per unit, and a closing date. Members commit to their desired quantities during the commitment window. Once the MOQ is reached, the buy is funded. Members are invoiced and pay via Zelle or Venmo. The order is placed with the vendor, the batch is sent to Freedom Diagnostics for testing, and once the COA is published and approved, the product is distributed to members with tracking numbers.",
  },
  {
    id: "what-is-moq",
    category: "process",
    question: "What is an MOQ and why does it matter?",
    answer:
      "MOQ stands for Minimum Order Quantity — the minimum total volume required for the vendor to fulfill the order at the group pricing. If the MOQ is not reached by the commitment deadline, the buy either does not proceed or is extended. Reaching the MOQ is what unlocks the wholesale pricing that makes group buying economically worthwhile.",
  },
  {
    id: "timeline",
    category: "process",
    question: "How long does a group buy take from commitment to delivery?",
    answer:
      "Timelines vary by vendor and product. Domestic vendors typically fulfill in 2–4 weeks after payment. International vendors (China, etc.) typically require 4–8 weeks including shipping and customs. Testing adds approximately 1–2 weeks. PBG provides real-time status updates on the platform and through the Skool community throughout the process.",
  },
  {
    id: "cancel-order",
    category: "process",
    question: "Can I cancel my order after committing?",
    answer:
      "Commitments are binding once the buy is funded and payment is requested. If you need to cancel before the buy is funded, contact the admin through the platform. Cancellations after payment has been made are handled on a case-by-case basis.",
  },
  {
    id: "after-ships",
    category: "process",
    question: "What happens after my order ships?",
    answer:
      "You will receive a shipping notification through the platform with your tracking number and carrier. You can track your order directly from the platform's My Orders page. PBG also posts real-time shipping updates in the Skool community discussion.",
  },
  {
    id: "problem-order",
    category: "process",
    question: "What if I have a problem with my order?",
    answer:
      "Contact the admin directly through the platform's messaging system or through the Skool community. PBG has a track record of resolving issues directly and transparently. Problems are not ignored or deflected.",
  },

  // ── Membership ────────────────────────────────────────────────────────────
  {
    id: "how-to-join",
    category: "membership",
    question: "How do I join?",
    answer:
      "Membership requires two steps. First, join the Skool community at skool.com/peptide-buyer-group — this is the community hub where discussions, updates, and announcements happen. Second, submit a membership access request at peptide-buy.com/join. Once your request is reviewed and approved, you will receive a unique invite code by email to activate your platform account.",
  },
  {
    id: "why-skool",
    category: "membership",
    question: "Why do I need to join Skool first?",
    answer:
      "The Skool community is the social and accountability layer of PBG. All members are known participants in the community, which creates accountability and trust. Discussions, shipping updates, Zoom calls, and community Q&A all happen in Skool. The platform handles the operational side (orders, payments, tracking, COAs), while Skool handles the community side.",
  },
  {
    id: "skool-fee",
    category: "membership",
    question: "Why is there a fee for the Skool group?",
    answer:
      "Running a group buy operation at this level involves significant behind-the-scenes work: vendor research and vetting, factory communications, order coordination, splitting and repackaging bulk orders, arranging independent lab testing, managing logistics, handling customs documentation, coordinating distributions, and providing ongoing community support. The Skool membership fee helps sustain the infrastructure and the team's time that makes all of this possible. It is not a passive community — it is an actively managed operation.",
  },
  {
    id: "how-approved",
    category: "membership",
    question: "How are members approved?",
    answer:
      "Access requests are reviewed by the PBG admin team. Approval is based on Skool community membership and a brief review of the request. PBG maintains a closed, verified community to protect the integrity of the buying group and the accountability of all participants.",
  },
  {
    id: "referral",
    category: "membership",
    question: "Can I refer someone?",
    answer:
      "Yes. If you know someone who would be a good fit for the community, encourage them to join the Skool group and submit a request at peptide-buy.com/join. Referrals from existing members carry weight in the approval process.",
  },

  // ── Payment ───────────────────────────────────────────────────────────────
  {
    id: "payment-methods",
    category: "payment",
    question: "What payment methods do you accept?",
    answer:
      "PBG accepts Zelle and Venmo only. Credit card processors and payment platforms like PayPal do not support transactions in this product category, so bank-to-bank transfers are the standard. Zelle: ray@vcloud9.com. Venmo: @ray-collazo. When sending payment, always include your name and the buy name in the payment note so it can be matched to your order.",
  },
  {
    id: "when-to-pay",
    category: "payment",
    question: "When do I pay?",
    answer:
      "You pay after your order is confirmed and moves to 'Payment Pending' status on the platform. You will receive an automatic notification when payment is due. You do not pay at the time of commitment — the commitment window is for gauging demand and reaching MOQ.",
  },
  {
    id: "why-no-credit-card",
    category: "payment",
    question: "Why can't I pay with a credit card?",
    answer:
      "Credit card processors and platforms like PayPal classify peptides as a restricted or high-risk product category and will not process these transactions. This is an industry-wide reality, not specific to PBG. Zelle and Venmo are the standard payment methods used across the peptide research community.",
  },

  // ── Beyond Peptides ───────────────────────────────────────────────────────
  {
    id: "only-peptides",
    category: "beyond",
    question: "Do you only do peptides?",
    answer:
      "No. While peptides are the primary focus, PBG group buys are not limited to peptides. The platform also sources and organizes group buys for supplies that operators and researchers commonly need: injection supplies, pens, vial boxes, reconstitution supplies, and other operational materials. The same vetting and quality standards apply to all products.",
  },
  {
    id: "for-resellers",
    category: "beyond",
    question: "I'm a reseller or operator. Is this for me?",
    answer:
      "Yes. PBG is particularly valuable for resellers and operators who need consistent, verified supply at volume pricing. Beyond the buying benefits, the PBG community is a resource for operators looking to improve their own operations — sharing ideas on websites, advertising, automation, and building sustainable businesses. The community is designed to help operators succeed, not just buy product.",
  },
  {
    id: "suggest-product",
    category: "beyond",
    question: "How do I suggest a new product for a group buy?",
    answer:
      "Post your suggestion in the Skool community discussion thread dedicated to product requests. Include the product type, your intended use case, and an estimate of how much you would need. Suggestions that generate community interest are evaluated for vendor sourcing and vetting. PBG will always communicate whether a suggested buy is moving forward or being passed on, and why.",
  },

  // ── Transparency ──────────────────────────────────────────────────────────
  {
    id: "communication",
    category: "transparency",
    question: "How does PBG communicate with members?",
    answer:
      "PBG uses multiple channels to keep members informed. The platform provides automated status updates at every stage of the order lifecycle — commitment, payment due, order placed, testing in progress, COA published, shipped. The Skool community is used for announcements, discussions, and real-time shipping updates. Weekly Zoom calls (or as-needed calls for active buys) are held for Q&A and live updates. Members are never left wondering what is happening with their order.",
  },
  {
    id: "zoom-recorded",
    category: "transparency",
    question: "Are Zoom calls recorded?",
    answer:
      "Zoom calls are typically recorded and posted to the Skool community for members who cannot attend live.",
  },

  // ── Founder Background ────────────────────────────────────────────────────
  {
    id: "founder-background",
    category: "founder",
    question: "Who is Ray Collazo and what is his background in imports?",
    answer:
      "Ray Collazo is the founder of Peptide Buy Group and the principal of VCloud9 LLC, a company with deep roots in international import and group buying operations. Ray began organizing group buys in the early days of the e-cigarette market, when the only source for quality hardware was direct from Chinese manufacturers. He applied the same model to electronics, hardware, kitchen knives, and motorcycles — building a systematic process for vetting overseas vendors, managing bulk imports, and distributing to community members. During the COVID-19 pandemic, when PPE supply chains had collapsed globally, Ray and his team leveraged their existing relationships with factories in China and Vietnam to organize large-scale imports of nitrile gloves, gowns, disinfectants, and other critical PPE. The team's ability to execute under those conditions — delivering tens of millions of dollars in product with a documented track record — reflects the operational discipline and supplier relationships that PBG is built on. The PBG team has made in-person visits to factories in China, Vietnam, and Malaysia to inspect quality controls, meet production teams, and build the direct relationships that make reliable sourcing possible.",
  },
  {
    id: "why-peptides",
    category: "founder",
    question: "Why did you expand into peptides specifically?",
    answer:
      "The peptide research community has a significant trust and quality problem. Vendors self-report purity, independent testing is expensive and rarely done, and mislabeling is common. Ray saw an opportunity to apply the same import discipline and vendor relationship framework that worked for PPE and electronics to a market that desperately needed it. The group buying model — pooling demand, sharing testing costs, requiring batch labeling — directly addresses the core problems in the market.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function FAQItem({ faq }: { faq: typeof faqs[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-sm leading-relaxed">{faq.question}</span>
        {open ? (
          <ChevronUp size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
          {faq.answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const { isAuthenticated, loading } = useAuth();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let items = faqs;
    if (activeCategory) items = items.filter((f) => f.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q)
      );
    }
    return items;
  }, [search, activeCategory]);

  // Group by category for display
  const grouped = useMemo(() => {
    const map: Record<string, typeof faqs> = {};
    for (const f of filtered) {
      if (!map[f.category]) map[f.category] = [];
      map[f.category].push(f);
    }
    return map;
  }, [filtered]);

  const activeCategoryOrder = activeCategory
    ? [activeCategory]
    : categories.map((c) => c.id).filter((id) => grouped[id]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="container h-14 flex items-center justify-between">
          <Link href="/">
            <span className="flex items-center cursor-pointer">
              <img src="/manus-storage/pbg-logo-v2_631d4d9d.png" alt="Peptide Buy Group" className="h-8 w-auto" />
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/join">How to Join</Link>
            </Button>
            {!loading && (
              isAuthenticated ? (
                <Button asChild size="sm">
                  <Link href="/dashboard">Dashboard <ArrowRight size={14} className="ml-1" /></Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <a href={getLoginUrl()}>Sign In <ArrowRight size={14} className="ml-1" /></a>
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/20">
        <div className="container py-14 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <HelpCircle size={12} />
            Knowledge Base
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm leading-relaxed">
            Everything you need to know about how Peptide Buy Group works — from safety and testing to membership and payments.
          </p>
          {/* Search */}
          <div className="max-w-md mx-auto relative mt-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </section>

      <div className="container py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar categories ─────────────────────────────────────── */}
          <aside className="lg:w-56 shrink-0">
            <div className="sticky top-20 space-y-1">
              <button
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  !activeCategory
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
                onClick={() => setActiveCategory(null)}
              >
                <HelpCircle size={15} />
                All Questions
                <span className="ml-auto text-xs text-muted-foreground">{faqs.length}</span>
              </button>
              {categories.map((cat) => {
                const count = faqs.filter((f) => f.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeCategory === cat.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                    onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  >
                    <span className={cat.color}>{cat.icon}</span>
                    {cat.label}
                    <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── FAQ list ───────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 space-y-10">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Search size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No questions match your search.</p>
                <button
                  className="text-primary text-sm mt-2 hover:underline"
                  onClick={() => { setSearch(""); setActiveCategory(null); }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              activeCategoryOrder.map((catId) => {
                const cat = categories.find((c) => c.id === catId);
                const items = grouped[catId];
                if (!items?.length) return null;
                return (
                  <section key={catId} className="space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={cat?.color}>{cat?.icon}</span>
                      <h2 className="font-semibold text-base">{cat?.label}</h2>
                      <span className="text-xs text-muted-foreground ml-1">({items.length})</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((faq) => (
                        <FAQItem key={faq.id} faq={faq} />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </main>
        </div>
      </div>

      {/* ── CTA footer ─────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/20 mt-10">
        <div className="container py-12 text-center space-y-4">
          <h2 className="text-xl font-bold">Still have questions?</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Join the Skool community to ask questions directly, or submit a membership request to get started.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="gap-2">
              <Link href="/join">Request Access <ArrowRight size={16} /></Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="https://www.skool.com/peptide-buyer-group" target="_blank" rel="noopener noreferrer">
                Join Skool Community
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
