import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "green" | "yellow" | "purple" | "red";
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    titleColor: "text-blue-600",
    valueColor: "text-blue-900",
    border: "border-blue-100"
  },
  green: {
    bg: "bg-green-50",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    titleColor: "text-green-600",
    valueColor: "text-green-900",
    border: "border-green-100"
  },
  yellow: {
    bg: "bg-yellow-50",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    titleColor: "text-yellow-600",
    valueColor: "text-yellow-900",
    border: "border-yellow-100"
  },
  purple: {
    bg: "bg-purple-50",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    titleColor: "text-purple-600",
    valueColor: "text-purple-900",
    border: "border-purple-100"
  },
  red: {
    bg: "bg-red-50",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    titleColor: "text-red-600",
    valueColor: "text-red-900",
    border: "border-red-100"
  }
};

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  subtitle, 
  trend 
}: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <Card className={`${colors.bg} ${colors.border} hover:shadow-lg transition-shadow cursor-pointer`}>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`w-12 h-12 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
            <Icon className={`${colors.iconColor} h-6 w-6`} />
          </div>
          <div className="ml-4 flex-1">
            <p className={`text-sm font-medium ${colors.titleColor}`}>{title}</p>
            <p className={`text-2xl font-bold ${colors.valueColor}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-1">
                <span className={`text-xs font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend.isPositive ? '↗' : '↘'} {trend.value}
                </span>
                <span className="text-xs text-gray-500 ml-1">vs last period</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
