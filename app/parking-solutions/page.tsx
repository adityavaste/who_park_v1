// src/app/parking-solutions/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Wrong Parking & Blocked Car Solutions in India — Who Park QR Alerts',
  description:
    'Dealing with double parking, blocked apartment gates, or cars left with headlights on? See how Who Park QR stickers solve everyday parking issues in India without sharing mobile numbers.',
  alternates: {
    canonical: '/parking-solutions',
  },
};

const SCENARIOS = [
  {
    emoji: '🚗',
    title: 'Car Blocking Your Driveway or Gate',
    problem:
      'Someone double-parked behind your vehicle in a market, society lane, or office basement and left no phone number on the dashboard.',
    solution:
      'Scan their Who Park windshield QR sticker with any phone camera. The owner gets an instant live ringtone and can reply in one tap ("Coming in 2 mins!").',
  },
  {
    emoji: '👩🏻‍💼',
    title: 'Privacy & Safety for Women and Family Drivers',
    problem:
      'Writing your personal mobile number on a paper slip on the dashboard exposes you to spam calls, WhatsApp messages, and privacy risks.',
    solution:
      'Replace paper slips with a private Who Park QR sticker. Strangers can notify you about your parked car without ever seeing your mobile number.',
  },
  {
    emoji: '💡',
    title: 'Headlights Left On or Window Open',
    problem:
      'Passersby notice your car headlights are draining the battery or a window was left open before rain, with no way to inform you.',
    solution:
      'One tap on "Lights / Window Open" sends an instant alert to your phone before your battery dies.',
  },
  {
    emoji: '🏢',
    title: 'Co-operative Housing Societies & IT Parks',
    problem:
      'Security guards waste 15–20 minutes calling flats on the intercom to trace who owns a visitor or wrongly parked vehicle.',
    solution:
      'Residents and visitors scan the Who Park QR tag to trigger an instant alert directly to the vehicle owner.',
  },
  {
    emoji: '🚨',
    title: 'Traffic Police Tow Warning & Emergency',
    problem:
      'Your car is parked in a no-parking / tow-away zone or blocking an emergency lane and needs to be moved immediately.',
    solution:
      'Good Samaritans or traffic staff trigger a high-priority Tow / Emergency ringtone alert to save you towing fines.',
  },
];

export default function ParkingSolutionsPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF0] text-black py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Top Nav */}
      <nav className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="bg-white hover:bg-yellow-100 text-black font-black text-xs px-4 py-2 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] transition"
        >
          🚕 WHO PARK HOME
        </Link>
        <Link
          href="/login"
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs px-4 py-2 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] transition"
        >
          GET FREE QR STICKER ➔
        </Link>
      </nav>

      {/* SEO Hero */}
      <header className="bg-white border-4 border-black p-6 sm:p-10 rounded-3xl shadow-[8px_8px_0px_#000] mb-10">
        <span className="inline-block bg-yellow-300 border-2 border-black text-xs font-black px-3 py-1 rounded-full uppercase mb-3">
          Smart Parking Guide • India
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
          How to Contact a Parked Car Owner Without Sharing Phone Numbers
        </h1>
        <p className="text-sm sm:text-base font-bold text-stone-700 mt-4 leading-relaxed">
          Every day across Indian cities, housing societies, and office basements, drivers get stuck behind double-parked vehicles—or risk their privacy by leaving mobile numbers on their dashboards. Here is how Who Park QR stickers solve all 5 everyday parking problems.
        </p>
      </header>

      {/* Scenarios List */}
      <section className="space-y-6">
        {SCENARIOS.map((item) => (
          <article
            key={item.title}
            className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_#000]"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{item.emoji}</span>
              <h2 className="text-xl font-black">{item.title}</h2>
            </div>
            <p className="text-xs sm:text-sm font-bold text-stone-600 mt-2">
              <strong className="text-black">The Problem:</strong> {item.problem}
            </p>
            <p className="text-xs sm:text-sm font-bold text-black mt-2 bg-yellow-100 border-2 border-black p-3 rounded-2xl">
              <strong>The Who Park Fix:</strong> {item.solution}
            </p>
          </article>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="mt-12 bg-yellow-400 border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_#000] text-center">
        <h2 className="text-2xl sm:text-3xl font-black">
          Protect Your Car & Privacy with Who Park
        </h2>
        <p className="text-xs sm:text-sm font-bold text-black/80 mt-2 max-w-lg mx-auto">
          Register your vehicle for free, print your custom windshield QR sticker, and get live ringtone alerts whenever someone needs you to move.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block bg-black hover:bg-stone-800 text-yellow-400 font-black text-sm px-7 py-4 rounded-2xl border-3 border-black shadow-[4px_4px_0px_#fff] transition"
        >
          CREATE FREE WHO PARK QR 🚀
        </Link>
      </section>
    </main>
  );
}