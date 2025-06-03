import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  valueColor?: string;
  description?: string;
  trend?: string;
  trendUp?: boolean;
  trendValue?: string;
  color?: string;
  isLoading?: boolean;
}

export function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  valueColor = "text-gray-900 dark:text-gray-100",
  description,
  trend,
  trendUp,
  trendValue,
  color,
  isLoading = false
}: StatCardProps) {
  // Handle color-based styling
  const getColorClasses = (colorName?: string) => {
    switch (colorName) {
      case 'blue':
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          iconColor: 'text-blue-600 dark:text-blue-400'
        };
      case 'green':
        return {
          iconBg: 'bg-green-100 dark:bg-green-900/20',
          iconColor: 'text-green-600 dark:text-green-400'
        };
      case 'yellow':
        return {
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
          iconColor: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'purple':
        return {
          iconBg: 'bg-purple-100 dark:bg-purple-900/20',
          iconColor: 'text-purple-600 dark:text-purple-400'
        };
      case 'red':
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          iconColor: 'text-red-600 dark:text-red-400'
        };
      default:
        return {
          iconBg: iconBgColor || 'bg-blue-100 dark:bg-blue-900/20',
          iconColor: iconColor || 'text-blue-600 dark:text-blue-400'
        };
    }
  };

  const colorClasses = getColorClasses(color);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-20"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
          <div className="p-3 rounded-lg flex-shrink-0 bg-gray-200 dark:bg-gray-700">
            <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
          {trend && (
            <p className={`text-xs mt-1 ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {trend}
            </p>
          )}
          {trendValue && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              ↗ {trendValue}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg flex-shrink-0 ${colorClasses.iconBg}`}>
          <div className={`h-6 w-6 ${colorClasses.iconColor}`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
