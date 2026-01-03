import { Link, useLocation } from "wouter";
import { LayoutDashboard, Sparkles, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import rabbitLogo from "@assets/generated_images/red_rabbit_jumping_icon.png";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase },
    { href: "/predictions", label: "Predictions", icon: Sparkles },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={rabbitLogo} alt="JackRabbit" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold font-display tracking-tight text-foreground">
              Jack<span className="text-red-600">Rabbit</span>
            </span>
          </div>
          
          <div className="flex space-x-1 bg-secondary/50 p-1 rounded-full px-2 py-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer select-none",
                    isActive 
                      ? "bg-white text-primary shadow-sm shadow-black/5" 
                      : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                  )}>
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
