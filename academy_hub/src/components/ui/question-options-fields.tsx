import { Input } from "@/components/ui/input";
import { OPTION_LABELS } from "@/lib/questions";

const OPTION_NAMES = ["optionA", "optionB", "optionC", "optionD"] as const;

export function QuestionOptionsFields({ prefix = "" }: { prefix?: string }) {
  const name = (key: string) => (prefix ? `${prefix}${key}` : key);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTION_LABELS.map((label, i) => (
        <div key={label}>
          <label className="block text-xs text-muted mb-1.5">Option {label}</label>
          <Input
            name={name(OPTION_NAMES[i])}
            placeholder={`Answer choice ${label}`}
            required
            maxLength={200}
          />
        </div>
      ))}
    </div>
  );
}
