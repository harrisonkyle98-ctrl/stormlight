import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'

const Terms = () => {
  usePageTitle('Terms & Conditions')

  return (
    <div className="pt-[220px]">
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="fantasy-section p-8">
        <h1 className="text-3xl font-bold text-white mb-6 font-['Cinzel',serif]">Terms &amp; Conditions</h1>
        
        <div className="space-y-6 text-slate-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Stormlight, you accept and agree to be bound by the terms and 
              provisions of this agreement. If you do not agree to abide by these terms, please do 
              not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Use of Service</h2>
            <p>
              Stormlight is a clan management and tracking tool for RuneScape 3. The service is 
              provided for informational and organizational purposes only. We are not affiliated 
              with Jagex Ltd. or RuneScape.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. 
              You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Collection</h2>
            <p>
              We collect publicly available RuneScape player data through official APIs. This includes 
              player statistics, achievements, and activity logs. We do not collect personal information 
              beyond what is necessary for account authentication.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Privacy</h2>
            <p>
              Your privacy is important to us. We do not sell or share your personal information with 
              third parties. Data collected is used solely for the operation of this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Disclaimer</h2>
            <p>
              This service is provided "as is" without any warranties, expressed or implied. We do not 
              guarantee the accuracy, completeness, or timeliness of the data displayed. RuneScape and 
              all related trademarks are property of Jagex Ltd.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service 
              after any changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Contact</h2>
            <p>
              If you have any questions about these Terms &amp; Conditions, please contact the clan 
              leadership through the official clan Discord.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Terms
