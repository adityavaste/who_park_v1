// app/terms/page.tsx
import LegalLayout from '@/components/LegalLayout';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions">
      <p>
        By accessing or using <strong>whopark.in</strong> or the <strong>WHO PARK</strong> mobile
        application, you agree to be bound by these Terms & Conditions.
      </p>

      <h2 className="text-lg font-black text-neutral-950 pt-2">1. Purpose of Service</h2>
      <p>
        WHO PARK provides smart QR vehicle alert stickers and privacy-first communication tools allowing
        citizens to notify vehicle owners about parking obstructions, open headlights/windows, or towing
        emergencies without sharing personal phone numbers.
      </p>

      <h2 className="text-lg font-black text-neutral-950 pt-2">2. User Responsibilities</h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>You must register only vehicles that you own or are legally authorized to operate.</li>
        <li>
          You agree not to misuse the alert or anonymous calling features for harassment, spam, prank
          calls, or unlawful purposes.
        </li>
        <li>
          To prevent abuse, alerts are rate-limited (1 ping per 5 minutes, up to 10 alerts/day, and up to
          3 anonymous voice calls/day of 3 minutes max duration).
        </li>
      </ul>

      <h2 className="text-lg font-black text-neutral-950 pt-2">3. Pricing & Payments</h2>
      <p>
        Generating a digital QR sticker for personal use is currently offered free of charge. Any paid
        physical printed stickers, bulk society/fleet packs, or premium add-ons are billed in Indian
        Rupees (INR) inclusive of applicable taxes via Razorpay.
      </p>

      <h2 className="text-lg font-black text-neutral-950 pt-2">4. Governing Law & Jurisdiction</h2>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of India. Any disputes
        arising out of these Terms shall be subject to the exclusive jurisdiction of the courts in{' '}
        <strong>Pune, Maharashtra, India</strong>.
      </p>
    </LegalLayout>
  );
}