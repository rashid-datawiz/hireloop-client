"use client"

import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { USER_ROLE_OPTIONS, type UserRole } from "@/lib/auth-roles"

const optionClassName =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.05] has-[:checked]:border-[#635ff4]/70 has-[:checked]:bg-[#635ff4]/10"

const radioClassName =
  "mt-0.5 border-white/25 bg-white/[0.04] hover:border-white/40 data-checked:border-[#635ff4] data-checked:bg-[#635ff4]"

type AuthRoleFieldProps = {
  name: string
  label: string
  defaultValue?: UserRole
  error?: string
}

export function AuthRoleField({
  name,
  label,
  defaultValue = "seeker",
  error,
}: AuthRoleFieldProps) {
  return (
    <FieldSet className="gap-3">
      <FieldLegend className="mb-0 font-display text-[13px] font-medium text-white/75">
        {label}
      </FieldLegend>

      <RadioGroup name={name} defaultValue={defaultValue} className="gap-2.5">
        {USER_ROLE_OPTIONS.map((option) => (
          <label key={option.value} className={optionClassName}>
            <RadioGroupItem value={option.value} className={radioClassName} />
            <span className="flex flex-col gap-0.5">
              <span className="font-display text-[14px] font-medium text-white">
                {option.label}
              </span>
              <span className="font-display text-[12px] leading-snug text-white/45">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {error ? (
        <FieldError className="font-display text-[13px] text-[#f87171]">
          {error}
        </FieldError>
      ) : null}
    </FieldSet>
  )
}
