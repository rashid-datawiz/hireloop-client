import Image from "next/image"

import googleMark from "@/app/images/google-mark.png"

export function GoogleButton({
  label = "Continue with Google",
  onClick,
}: {
  label?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-white/12 bg-white/[0.04] font-display text-[14px] font-medium text-white/85 transition-colors outline-none hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:ring-3 focus-visible:ring-[#635ff4]/60"
    >
      <Image
        src={googleMark}
        alt=""
        width={18}
        height={18}
        className="size-[18px]"
      />
      <span>{label}</span>
    </button>
  )
}
