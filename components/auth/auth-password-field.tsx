"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const controlClassName =
  "h-11 rounded-xl border-white/12 bg-white/[0.04] px-3.5 pr-11 font-display text-[15px] text-white transition-colors placeholder:text-white/30 hover:border-white/20 focus-visible:border-[#635ff4] focus-visible:ring-[#635ff4]/35 md:text-[15px] dark:bg-white/[0.04]"

type AuthPasswordFieldProps = {
  id: string
  label: string
  name: string
  placeholder?: string
  autoComplete?: string
  error?: string
}

export function AuthPasswordField({
  id,
  label,
  name,
  placeholder,
  autoComplete = "current-password",
  error,
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel
        htmlFor={id}
        className="font-display text-[13px] font-medium text-white/75"
      >
        {label}
      </FieldLabel>

      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className={controlClassName}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-white/40 transition-colors hover:text-white/70 focus-visible:ring-3 focus-visible:ring-[#635ff4]/60 focus-visible:outline-none"
        >
          {visible ? (
            <EyeOffIcon aria-hidden="true" className="size-[18px]" />
          ) : (
            <EyeIcon aria-hidden="true" className="size-[18px]" />
          )}
        </button>
      </div>

      {error ? (
        <FieldError className="font-display text-[13px] text-[#f87171]">
          {error}
        </FieldError>
      ) : null}
    </Field>
  )
}
