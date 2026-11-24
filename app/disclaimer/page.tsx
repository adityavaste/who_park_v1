// app/disclaimer/page.tsx
import LegalLayout from '@/components/LegalLayout';

export default function DisclaimerPage() {
  return (
    <LegalLayout title="Disclaimer">
      <p>
        The information and alert services provided by <strong>WHO PARK</strong> (
        <strong>whopark.in</strong>) are intended solely as a convenience and community parking aid.
      </p>

      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>No Guarantee of Owner Response:</strong> While WHO PARK delivers instant push
          notifications and anonymous call rings, response times depend on the vehicle owner&apos;s mobile
          network connectivity, device settings, and availability.
        </li>
        <li>
          <strong>Not an Official Government / RTO Portal:</strong> WHO PARK is an independent private
          platform and is not affiliated with Parivahan, RTO, Traffic Police, or any government
          authority.
        </li>
        <li>
          <strong>Emergency Situations:</strong> In case of accidents, fire, theft, medical emergencies, or
          criminal activity, always contact official emergency services immediately by dialing{' '}
          <strong>112</strong> (India Emergency Helpline) or <strong>100</strong> (Police).
        </li>
        <li>
          <strong>User-Entered Data:</strong> Vehicle registration numbers and make/model details are
          self-declared by registered users. WHO PARK does not verify vehicle ownership documents.
        </li>
      </ul>
    </LegalLayout>
  );
}