// src/components/LegalLayout.tsx
import Link from 'next/link';

const LEGAL_LINKS = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Refund & Cancellation' },
  { href: '/shipping-policy', label: 'Shipping & Delivery' },
  { href: '/disclaimer', label: 'Disclaimer' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/delete-account', label: 'Delete Account' },
];

export default function LegalLayout({
  title,
  lastUpdated = 'November 21, 2026',
  children,
}: {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#FFFDF0] text-neutral-950 py-8 px-4 sm:px-6 selection:bg-yellow-300">
      <div className="max-w-3xl mx-auto">
        {/* Top Bar */}
        <nav className="flex items-center justify-between bg-white border-2 border-neutral-950 px-4 py-3 rounded-2xl shadow-[4px_4px_0px_#0a0a0a] mb-6">
          <Link href="/" className="flex items-center gap-2 font-black text-base">
            <span className="w-8 h-8 rounded-lg bg-yellow-400 border-2 border-neutral-950 flex items-center justify-center">
              W
            </span>
            <span>
              WHO<span className="text-yellow-500">PARK</span>
            </span>
          </Link>
          <Link
            href="/"
            className="bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-bold text-xs px-3.5 py-2 rounded-xl border-2 border-neutral-950 shadow-[2px_2px_0px_#0a0a0a]"
          >
            ← Back to Home
          </Link>
        </nav>

        {/* Main Content Card */}
        <article className="bg-white border-2 border-neutral-950 rounded-3xl p-6 sm:p-9 shadow-[6px_6px_0px_#0a0a0a]">
          <span className="inline-block bg-yellow-300 border border-neutral-950 text-[11px] font-bold px-3 py-0.5 rounded-full mb-3">
            Last Updated: {lastUpdated}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 mb-6">
            {title}
          </h1>

          <div className="space-y-5 text-sm sm:text-base text-neutral-800 leading-relaxed font-medium">
            {children}
          </div>
        </article>

        {/* Footer Legal Navigation */}
        <footer className="mt-8 bg-white border-2 border-neutral-950 rounded-2xl p-4 shadow-[4px_4px_0px_#0a0a0a]">
          <div className="flex flex-wrap gap-2 justify-center">
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FFFDF0] hover:bg-yellow-300 border border-neutral-950 transition"
              >
                {item.label}
              </Link>
            ))}
          </div>
          
<p className="text-center text-xs text-neutral-500 font-semibold mt-3">
            © 2026 WHO PARK • Pune, Maharashtra, India. All rights reserved.
          </p>         
        </footer>
      </div>
    </main>
  );
}