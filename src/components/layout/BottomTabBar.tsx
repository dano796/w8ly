import { useLocation, useNavigate } from "react-router-dom";
import { LayoutList, Dumbbell, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { tapAnimation, logoVariants } from "@/utils/animations";

const tabs = [
  { path: "/", icon: LayoutList, label: "Planner" },
  { path: "/exercises", icon: Dumbbell, label: "Ejercicios" },
  { path: "/__logo__", icon: null, label: "W8ly" },
  { path: "/profile", icon: User, label: "Perfil" },
  { path: "/settings", icon: Settings, label: "Config" },
];

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on workout/summary pages and when adding exercises from active workout or weekly planner
  const searchParams = new URLSearchParams(location.search);
  const fromWorkout = searchParams.get("fromWorkout");
  const day = searchParams.get("day");

  if (
    location.pathname.startsWith("/workout") ||
    location.pathname.startsWith("/summary") ||
    (location.pathname === "/exercises" && (fromWorkout || day))
  ) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {tabs.map((tab) => {
          if (tab.path === "/__logo__") {
            return (
              <motion.button
                key="logo"
                onClick={() => navigate("/")}
                className="flex items-center justify-center w-14 h-14"
                variants={logoVariants}
                whileTap="tap"
                whileHover="hover"
              >
                <img
                  src="/w8ly_logo.png"
                  alt="W8ly Logo"
                  className="w-full h-full object-contain"
                />
              </motion.button>
            );
          }

          const isActive = location.pathname === tab.path;
          const Icon = tab.icon!;

          return (
            <motion.button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center transition-colors relative",
                "gap-0.5 py-2 px-4 min-w-[44px] min-h-[44px]",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
              whileTap={tapAnimation}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-2xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 w-5 h-5" />
              <span className="font-medium relative z-10 text-[10px]">
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
