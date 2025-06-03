import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  valueColor?: string;
  description?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconBgColor = "bg-blue-100",
  iconColor = "text-blue-600",
  valueColor = "text-gray-900",
  description
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg flex-shrink-0 ${iconBgColor}`}>
          <div className={`h-6 w-6 ${iconColor}`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
