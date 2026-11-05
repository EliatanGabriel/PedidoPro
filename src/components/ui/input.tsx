export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={`flex h-9 w-full rounded-md border border-[#dfe7e1] bg-white px-3 py-1 text-sm text-[#4b5850] placeholder:text-[#8a958e] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#177a56] disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
      {...props}
    />
  );
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={`flex w-full rounded-md border border-[#dfe7e1] bg-white px-3 py-1.5 text-sm text-[#4b5850] placeholder:text-[#8a958e] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#177a56] disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
      {...props}
    />
  );
}

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={`flex h-9 w-full rounded-md border border-[#dfe7e1] bg-white px-3 py-1 text-sm text-[#4b5850] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#177a56] disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
      {...props}
    />
  );
}
