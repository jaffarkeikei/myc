import Link from 'next/link'
import { COLORS } from '@/lib/constants'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 py-20 sm:py-32">
        <div className="text-center">
          {/* Logo and Title */}
          <h1 className="text-5xl sm:text-7xl font-bold mb-8 myc-font" style={{ color: COLORS.primary }}>
            MYC
          </h1>

          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
            Get Your YC Application Roasted
          </h2>

          <p className="text-xl sm:text-2xl text-gray-600 mb-16 max-w-3xl mx-auto">
            10-minute sessions. No DMs. Just honest feedback from YC alumni and peers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-24">
            <Link
              href="/login?mode=signup"
              className="inline-block px-8 py-3 text-base yc-button rounded-md"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="inline-block px-8 py-3 text-base yc-button-secondary rounded-md"
            >
              Sign In
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 max-w-4xl mx-auto border-t border-gray-200 pt-16">
            <div>
              <h3 className="font-semibold text-lg mb-3 text-gray-900">Fast Feedback</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Get connected in minutes, not days. Quick 10-minute roast sessions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3 text-gray-900">Direct & Honest</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                No sugar-coating. Get the brutal truth about your application.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3 text-gray-900">YC Alumni Network</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Learn from founders who've been through the YC process.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-24 pt-8 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <a
                href="https://discord.gg/myc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
              >
                Join our community
              </a>
              <span className="hidden sm:inline text-gray-300">•</span>
              <a
                href="mailto:hello@myc.app"
                className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
              >
                Contact us
              </a>
            </div>
            <p className="text-xs text-gray-400 text-center">
              By using <span className="myc-font" style={{ color: '#FF6600' }}>MYC</span>, you agree to receive brutally honest feedback
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
