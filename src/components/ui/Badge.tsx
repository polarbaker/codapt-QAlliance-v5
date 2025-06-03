type BadgeColor = 
  | "primary" 
  | "secondary" 
  | "accent" 
  | "neutral" 
  | "tech-forest" 
  | "digital-sunrise" 
  | "global-cobalt" 
  | "neutral-brown"
  | "success"
  | "warning"
  | "info";

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor | string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Badge({ 
  children, 
  color = "secondary", 
  className = "",
  size = "md"
}: BadgeProps) {
  // Map color names to Tailwind classes
  const colorMap: Record<BadgeColor, string> = {
    primary: "bg-primary text-white",
    secondary: "bg-secondary text-white",
    accent: "bg-accent text-text-dark",
    neutral: "bg-neutral-medium text-white",
    "tech-forest": "bg-tech-forest text-white",
    "digital-sunrise": "bg-digital-sunrise text-white",
    "global-cobalt": "bg-global-cobalt text-white",
    "neutral-brown": "bg-neutral-brown text-white",
    "success": "bg-green-500 text-white",
    "warning": "bg-amber-500 text-text-dark",
    "info": "bg-blue-500 text-white"
  };

  // Size classes
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-3 py-1",
    lg: "text-sm px-4 py-1.5"
  };
  
  // Get the background class from the map or use the raw value as a fallback
  const colorClass = colorMap[color as BadgeColor] || color;
  
  return (
    <span 
      className={`inline-flex items-center justify-center font-medium rounded-full shadow-sm transition-all duration-200 ${sizeClasses[size]} ${colorClass} hover:scale-105 hover:shadow ${className}`}
    >
      {children}
    </span>
  );
}
