import Link from "next/link"
import { Briefcase, MapPin, Search } from "lucide-react"

const trendingPositions = [
  { label: "Product Designer", href: "/jobs?q=Product+Designer" },
  { label: "AI Engineering", href: "/jobs?q=AI+Engineering" },
  { label: "Dev-ops Engineer", href: "/jobs?q=Dev-ops+Engineer" },
]

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="hero-backdrop absolute inset-0 -z-10"
      />
      <div aria-hidden="true" className="hero-stars absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-background"
      />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-5 pt-20 pb-32 text-center sm:px-6 sm:pt-28 lg:px-10 lg:pt-[136px]">
        <div className="flex items-center">
          <span
            aria-hidden="true"
            className="hidden h-px w-16 bg-gradient-to-r from-transparent to-white/25 sm:block lg:w-20"
          />

          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 backdrop-blur-md sm:gap-3 sm:px-5">
            <Briefcase
              aria-hidden="true"
              className="size-[18px] shrink-0 text-[#f97316]"
            />
            <span className="font-display text-[16px] font-semibold whitespace-nowrap text-white sm:text-[18px]">
              50,000+
            </span>
            <span className="font-mono text-[10px] tracking-[0.15em] whitespace-nowrap text-white/45 uppercase sm:text-[13px] sm:tracking-[0.22em]">
              New Jobs This Month
            </span>
          </div>

          <span
            aria-hidden="true"
            className="hidden h-px w-16 bg-gradient-to-l from-transparent to-white/25 sm:block lg:w-20"
          />
        </div>

        <h1 className="mt-8 font-display text-[38px] leading-[1.08] font-bold tracking-[-0.02em] text-white sm:text-[46px] lg:text-[52px]">
          Find Your Dream Job Today
        </h1>

        <p className="mt-6 max-w-[740px] font-display text-[16px] leading-[1.75] text-white/55 sm:text-[19px]">
          HireLoop connects top talent with world-class companies. Browse
          thousands of curated opportunities and land your next role — faster.
        </p>

        <form
          action="/jobs"
          method="get"
          className="mt-12 flex w-full max-w-[790px] flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur-xl sm:flex-row sm:items-center sm:p-1.5"
        >
          <div className="flex flex-1 items-center gap-2.5 px-3 py-2 sm:py-0">
            <Search
              aria-hidden="true"
              className="size-5 shrink-0 text-white/40"
            />
            <input
              type="search"
              name="q"
              aria-label="Job title, skill or company"
              placeholder="Job title, skill or company"
              className="w-full min-w-0 bg-transparent font-display text-[15px] text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>

          <span
            aria-hidden="true"
            className="hidden h-7 w-px shrink-0 bg-white/12 sm:block"
          />

          <div className="flex flex-1 items-center gap-2.5 border-t border-white/10 px-3 py-2 sm:border-t-0 sm:py-0 sm:pl-4">
            <MapPin
              aria-hidden="true"
              className="size-5 shrink-0 text-white/40"
            />
            <input
              type="text"
              name="location"
              aria-label="Location or Remote"
              placeholder="Location or Remote"
              className="w-full min-w-0 bg-transparent font-display text-[15px] text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#635ff4] text-white transition-colors hover:bg-[#5a55ee] focus-visible:ring-3 focus-visible:ring-[#635ff4]/50 focus-visible:outline-none sm:size-[52px]"
          >
            <Search aria-hidden="true" className="size-5" />
            <span className="text-sm font-medium sm:sr-only">Search jobs</span>
          </button>
        </form>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-3">
          <span className="font-display text-[15px] text-white/45">
            Trending Position
          </span>

          {trendingPositions.map((position) => (
            <Link
              key={position.label}
              href={position.href}
              className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-1.5 font-display text-[14px] text-white/85 transition-colors hover:border-white/25 hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-[#635ff4]/50 focus-visible:outline-none"
            >
              {position.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
