export const OPTION_KEYS = ["optionA", "optionB", "optionC", "optionD"] as const;
export const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export type QuestionOptions = {
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

export function getOptionsList(question: QuestionOptions): string[] {
  return [question.optionA, question.optionB, question.optionC, question.optionD];
}

export function getOptionLabel(index: number): string {
  return OPTION_LABELS[index] ?? "?";
}

export function getSelectedOptionText(question: QuestionOptions, selectedOption: number): string {
  const options = getOptionsList(question);
  return options[selectedOption] ?? "Unknown";
}

export function parseOptionsFromFormData(formData: FormData) {
  return {
    optionA: String(formData.get("optionA") ?? "").trim(),
    optionB: String(formData.get("optionB") ?? "").trim(),
    optionC: String(formData.get("optionC") ?? "").trim(),
    optionD: String(formData.get("optionD") ?? "").trim(),
  };
}
