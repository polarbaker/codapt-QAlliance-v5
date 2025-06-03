import { Link } from "@tanstack/react-router";

interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

export function AdminCard({ 
  title, 
  description, 
  icon, 
  link, 
  disabled = false, 
  comingSoon = false 
}: AdminCardProps) {
  const card = (
    <div className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 ${
      disabled ? 'opacity-50' : 'hover:shadow-md hover:border-gray-300'
    }`}>
      <div className="mb-4">{icon}</div>
      <h2 className="mb-2 text-xl font-semibold text-gray-800">{title}</h2>
      <p className="text-gray-600 mb-2">{description}</p>
      {comingSoon && (
        <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          Coming Soon
        </span>
      )}
    </div>
  );

  if (disabled) {
    return (
      <div className="cursor-not-allowed" title={comingSoon ? "Coming soon" : "Not available"}>
        {card}
      </div>
    );
  }

  return (
    <Link to={link} className="no-underline block">
      {card}
    </Link>
  );
}
