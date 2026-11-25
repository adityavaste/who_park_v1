// app/contact/page.tsx
import LegalLayout from '@/components/LegalLayout';

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us">
      <p>
        Have questions about your WHO PARK QR sticker, billing, or account privacy? Reach out to our
        support team using the details below:
      </p>

      <div className="bg-[#FFFDF0] border-2 border-neutral-950 rounded-2xl p-5 space-y-2.5 text-sm">
        <p>
          <strong>Brand / Entity Name:</strong> WHO PARK
        </p>
        <p>
          <strong>Operational Address:</strong> Hadapsar, Pune, Maharashtra – 411028, India
        </p>
        <p>
          <strong>Support Email:</strong>{' '}
          <a href="mailto:support@whopark.in" className="underline font-bold">
            support@whopark.in
          </a>
        </p>
        <p>
          <strong>Support Hours:</strong> Monday – Saturday, 10:00 AM to 6:00 PM IST
        </p>
        <p>
          <strong>Response Time:</strong> We respond to all queries and refund/privacy requests within{' '}
          <strong>24 to 48 business hours</strong>.
        </p>
      </div>
    </LegalLayout>
  );
}