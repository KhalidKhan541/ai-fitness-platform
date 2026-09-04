import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-fitness-600 via-fitness-700 to-energy-600 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-[100px]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <span className="text-xl font-bold">F</span>
            </div>
            <span className="text-2xl font-bold">FitAI</span>
          </Link>
          <div>
            <h2 className="text-3xl font-bold leading-tight mb-4">
              Transform your body,
              <br />
              powered by AI.
            </h2>
            <p className="text-white/70 max-w-md text-sm leading-relaxed">
              Join 50,000+ athletes using AI-powered workouts, nutrition tracking,
              and personalized coaching to reach their fitness goals.
            </p>
            <div className="flex items-center gap-8 mt-8">
              <div>
                <div className="text-2xl font-bold">50K+</div>
                <div className="text-sm text-white/60">Active Users</div>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <div className="text-2xl font-bold">2M+</div>
                <div className="text-sm text-white/60">Workouts Done</div>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <div className="text-2xl font-bold">4.9</div>
                <div className="text-sm text-white/60">App Rating</div>
              </div>
            </div>
          </div>
          <div className="text-sm text-white/50">
            &copy; {new Date().getFullYear()} FitAI. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-fitness-500 to-energy-500">
              <span className="text-lg font-bold text-white">F</span>
            </div>
            <span className="text-xl font-bold">FitAI</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
