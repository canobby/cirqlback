import { useParams } from "wouter";
import LegalDoc from "@/components/legal/legal-doc";

// Generic page for legal/compliance docs at /legal/:slug (merchant agreement,
// coordinator agreement, 1099 guide). Terms/Privacy/FAQ keep their own friendly
// routes. The insurance/safeguards memo is intentionally internal (not routed).
const KNOWN = new Set(["terms", "privacy", "faq", "merchant", "coordinator", "coordinator-1099"]);

export default function LegalDocPage() {
  const params = useParams();
  const slug = String((params as any).slug || "");
  if (!KNOWN.has(slug)) {
    return (
      <div className="min-h-screen bg-slate-50 py-24 text-center text-slate-500">
        Document not found.
      </div>
    );
  }
  return <LegalDoc slug={slug} />;
}
