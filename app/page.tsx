import Link from 'next/link'
import { COLORS } from '@/lib/constants'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center">
          {/* Logo and Title */}
          <h1 className="text-6xl sm:text-8xl font-bold mb-6 myc-font" style={{ color: COLORS.primary }}>
            MYC
          </h1>

          <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">
            Get Your YC Application Roasted
          </h2>

          <p className="text-xl sm:text-2xl text-gray-600 mb-2">
            10-minute sessions. No DMs. Just feedback.
          </p>

          <p className="text-lg text-gray-500 mb-8">
            Connect with YC alumni and peers for brutally honest feedback
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/login?mode=signup"
              className="inline-block px-8 py-4 text-lg font-medium text-white rounded-lg yc-gradient hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="inline-block px-8 py-4 text-lg font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto mt-16">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </span>
                <h3 className="font-semibold text-lg">Fast Feedback</h3>
              </div>
              <p className="text-gray-600">
                Get connected in minutes, not days. Quick 10-minute roast sessions.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </span>
                <h3 className="font-semibold text-lg">Direct & Honest</h3>
              </div>
              <p className="text-gray-600">
                No sugar-coating. Get the brutal truth about your application.
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </span>
                <h3 className="font-semibold text-lg">YC Alumni Network</h3>
              </div>
              <p className="text-gray-600">
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
