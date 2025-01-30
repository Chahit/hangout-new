export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300">
              By accessing and using SNU Hangout, you accept and agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
            <p className="text-gray-300">
              To use SNU Hangout, you must:
            </p>
            <ul className="list-disc pl-5 text-gray-300 space-y-2 mt-2">
              <li>Be a current student or faculty member of Shiv Nadar University</li>
              <li>Have a valid @snu.edu.in email address</li>
              <li>Be at least 18 years old</li>
              <li>Be able to form a legally binding contract</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Account</h2>
            <p className="text-gray-300">
              You are responsible for:
            </p>
            <ul className="list-disc pl-5 text-gray-300 space-y-2 mt-2">
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-gray-300">
              You agree not to:
            </p>
            <ul className="list-disc pl-5 text-gray-300 space-y-2 mt-2">
              <li>Post harmful, offensive, or inappropriate content</li>
              <li>Harass, bully, or intimidate other users</li>
              <li>Impersonate others or provide false information</li>
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to circumvent any security features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Content</h2>
            <p className="text-gray-300">
              You retain ownership of content you post, but grant us a license to use,
              modify, and display it in connection with the service. You are solely
              responsible for your content and its accuracy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Termination</h2>
            <p className="text-gray-300">
              We reserve the right to suspend or terminate your account for violations
              of these terms or for any other reason at our sole discretion. Upon
              graduation or leaving SNU, your account may be deactivated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Disclaimers</h2>
            <p className="text-gray-300">
              The service is provided &quot;as is&quot; without warranties of any kind. We are
              not responsible for any content posted by users or for any interactions
              between users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Changes to Terms</h2>
            <p className="text-gray-300">
              We may modify these terms at any time. Continued use of the service
              after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
            <p className="text-gray-300">
              For questions about these Terms of Service, please contact us at:
              <br />
              Email: support@snuhangout.com
            </p>
          </section>

          <footer className="text-gray-400 mt-12">
            Last updated: January 26, 2024
          </footer>
        </div>
      </div>
    </div>
  );
} 