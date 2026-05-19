import { Check } from "lucide-react";
import { authCheckboxClass, authCheckboxIconClass } from "./auth-styles";
import { cn } from "@/lib/utils";

export function AuthCheckbox({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}) {
  const inputId = id ?? "auth-checkbox";

  return (
    <label
      htmlFor={inputId}
      className="flex cursor-pointer select-none items-center gap-2.5"
    >
      <span className="relative inline-flex">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={cn(authCheckboxClass, "peer")}
        />
        <span className={authCheckboxIconClass}>
          <Check className="h-3 w-3 stroke-[3]" />
        </span>
      </span>
      <span className="text-sm text-slate-400">{label}</span>
    </label>
  );
}
