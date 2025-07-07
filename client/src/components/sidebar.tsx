import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: "fas fa-tachometer-alt" },
    { name: "Campaigns", href: "/campaigns", icon: "fas fa-bullhorn" },
    { name: "Analytics", href: "/analytics", icon: "fas fa-chart-bar" },
    { name: "Integration", href: "/integration", icon: "fas fa-code" },
    { name: "Webhook", href: "/webhook", icon: "fas fa-link" },
    { name: "Facebook Ads", href: "/facebook", icon: "fab fa-facebook" },
  ];

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-chart-line text-white text-lg"></i>
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-gray-900">MétricaClick</h1>
            <p className="text-sm text-gray-500">Traffic Tracker</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4">
        <div className="space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 rounded-lg transition-colors",
                location === item.href
                  ? "text-primary bg-blue-50"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <i className={`${item.icon} w-5`}></i>
              <span className="ml-3 font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
