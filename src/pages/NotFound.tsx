import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Sparkles, Home, Utensils, User, CalendarRange, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const suggestions = [
    { to: "/profile", label: "Profile", icon: User },
    { to: "/", label: "Plans", icon: CalendarRange },
    { to: "/market", label: "Market", icon: Store },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>

        <p className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold mb-2">NutriLens AI</p>
        <h1 className="text-7xl font-bold text-primary leading-none tracking-tight">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">This page took a snack break 🍳</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may have moved, expired, or never existed. Let's get you back to tracking.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/">
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="gap-2">
            <Link to="/log-food">
              <Utensils className="w-4 h-4" />
              Log a meal
            </Link>
          </Button>
        </div>

        <div className="mt-10">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Or try one of these</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs text-foreground hover:bg-muted hover:border-primary/30 transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-8 text-[11px] text-muted-foreground/60 font-mono break-all">
          {location.pathname}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground/60">
          Still stuck? Email <span className="text-foreground/80">support@nutrilens.app</span>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
