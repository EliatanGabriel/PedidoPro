export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg";
}

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#177a56] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-[#177a56] text-white hover:bg-[#156c48]",
    secondary: "border border-[#dfe7e1] bg-white text-[#4b5850] hover:bg-[#f3f7f5]",
    ghost: "text-[#4b5850] hover:bg-[#f3f7f5]",
    destructive:
      "border border-[#f2dede] bg-[#fdf3f3] text-[#9c2b2b] hover:bg-[#fbe9e9]",
  };
  const sizes = { sm: "h-8 px-3", default: "h-10 px-4 py-2", lg: "h-11 px-8" };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className ?? ""}`}
      {...props}
    />
  );
}
