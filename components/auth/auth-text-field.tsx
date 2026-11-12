import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const controlClassName =
  "h-11 rounded-xl border-white/12 bg-white/[0.04] px-3.5 font-display text-[15px] text-white transition-colors placeholder:text-white/30 hover:border-white/20 focus-visible:border-[#635ff4] focus-visible:ring-[#635ff4]/35 md:text-[15px] dark:bg-white/[0.04]"

type AuthTextFieldProps = {
  id: string
  label: string
  name: string
  type?: React.HTMLInputTypeAttribute
  placeholder?: string
  autoComplete?: string
  error?: string
}

export function AuthTextField({
  id,
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  error,
}: AuthTextFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel
        htmlFor={id}
        className="font-display text-[13px] font-medium text-white/75"
      >
        {label}
      </FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={controlClassName}
      />
      {error ? (
        <FieldError className="font-display text-[13px] text-[#f87171]">
          {error}
        </FieldError>
      ) : null}
    </Field>
  )
}
