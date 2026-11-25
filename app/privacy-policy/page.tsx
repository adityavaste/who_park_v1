// app/privacy-policy/page.tsx
import LegalLayout from '@/components/LegalLayout';

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        <strong>WHO PARK</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), based
        in Pune, Maharashtra, India, respects your privacy. This Privacy Policy explains how we
        collect, use, and safeguard your information across <strong>whopark.in</strong> and the{' '}
        <strong>WHO PARK Android mobile application</strong>.
      </p>

      <h2 className="text-lg font-black text-neutral-950 pt-2">1. Information We Collect</h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Account Information:</strong> Name, email address, and profile photo provided when you
          sign in via Google Authentication.
        </li>
        <li>
          <strong>Vehicle & QR Tag Details:</strong> Vehicle registration number (license plate), vehicle
          make/model, and optional emergency contact details you voluntarily add.
        </li>
        <li>
          <strong>Device & Push Tokens:</strong> Firebase Cloud Messaging (FCM) device tokens and web
          push subscriptions used strictly to deliver instant parking alerts and incoming call rings.
        </li>
        <li>
          <strong>Anonymous Scanner Identifiers:</strong> A randomly generated browser/device ID used to
          enforce anti-spam limits (maximum 3 calls and 10 alerts per day).
        </li>
      </ul>

      <h2 className="text-lg font-black text-neutral-950 pt-2">2. How We Protect Your Privacy</h2>
      <p>
        When a bystander scans your WHO PARK QR sticker, your mobile number, email address, and personal
        identity are <strong>never displayed</strong> to the scanner. All voice calls are routed over
        encrypted WebRTC peer-to-peer audio without exposing caller or owner phone numbers. We do not
        record or store voice call audio.
      </p>

      <h2 className="text-lg font-black text-neutral-950 pt-2">3. Permissions Used (Android App)</h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Camera:</strong> Used solely to scan WHO PARK QR stickers on vehicles.
        </li>
        <li>
          <strong>Microphone:</strong> Used solely during active anonymous WebRTC voice calls initiated or
          answered by you.
        </li>
        <li>
          <strong>Notifications:</strong> Used to alert you immediately when someone scans your vehicle QR.
        </li>
      </ul>

      <h2 className="text-lg font-black text-neutral-950 pt-2">4. Third-Party Services & Payments</h2>
      <p>
        We use trusted infrastructure providers including Google Firebase (Authentication & Push
        Notifications), Neon/PostgreSQL (encrypted database hosting), Vercel (web hosting), and{' '}
        <strong>Razorpay</strong> (for processing optional paid sticker orders or premium plans). We do
        not store your credit/debit card or UPI PIN details on our servers.
      </p>

      <h2 className="text-lg font-black text-neutral-950 pt-2">5. Data Retention & Deletion</h2>
      <p>
        Alert logs are retained for operational security and spam prevention. You may permanently delete
        your account and all associated vehicle and QR records at any time via our{' '}
        <a href="/delete-account" className="underline font-bold">
          Account Deletion Page
        </a>
        .
      </p>
    </LegalLayout>
  );
}