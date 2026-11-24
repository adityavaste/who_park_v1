// app/refund-policy/page.tsx
import LegalLayout from '@/components/LegalLayout';

export default function RefundPolicyPage() {
  return (
    <LegalLayout title="Return, Refund & Cancellation Policy">
      <p>
        Thank you for using <strong>WHO PARK</strong>. Please read our cancellation, return, and refund
        policy carefully before placing an order.
      </p>

      <h2 className="text-lg font-black text-neutral-950 pt-2">1. Digital QR Stickers & Subscriptions</h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          Digital QR codes and downloadable print files are generated and delivered instantaneously upon
          registration or payment. Therefore, digital products are non-returnable once generated.
        </li>
        <li>
          If you were charged due to a technical error or duplicate payment and the service was not
          activated, you may request a full refund within <strong>48 hours</strong> of the transaction.
        </li>
      </ul>

      <h2 className="text-lg font-black text-neutral-950 pt-2">2. Physical Printed Windshield Stickers</h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Cancellation:</strong> Orders for custom-printed QR stickers can be cancelled within{' '}
          <strong>6 hours</strong> of placing the order, provided printing/dispatch has not started.
        </li>
        <li>
          <strong>Returns & Replacements:</strong> Because stickers are custom-printed with your unique
          vehicle QR slug, returns are accepted only if the product arrives damaged, defective, or with
          an unreadable print. Please share an unboxing photo/video within <strong>48 hours</strong> of
          delivery at <strong>support@whopark.in</strong> for a free replacement or refund.
        </li>
      </ul>

      <h2 className="text-lg font-black text-neutral-950 pt-2">3. Refund Processing Timeline</h2>
      <p>
        Once a refund request is approved, the refund amount will be initiated within 2 business days and
        credited back to your original payment method (UPI, Debit/Credit Card, or Net Banking) within{' '}
        <strong>5 to 7 business days</strong>, depending on your bank&apos;s processing cycle.
      </p>
    </LegalLayout>
  );
}