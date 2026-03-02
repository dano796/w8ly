import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutList, Dumbbell, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/', icon: LayoutList, label: 'Planner' },
  { path: '/exercises', icon: Dumbbell, label: 'Ejercicios' },
  { path: '/__logo__', icon: null, label: 'W8ly' },
  { path: '/profile', icon: User, label: 'Perfil' },
  { path: '/settings', icon: Settings, label: 'Config' }];


export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on workout/summary pages
  if (location.pathname.startsWith('/workout') || location.pathname.startsWith('/summary')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          if (tab.path === '/__logo__') {
            return (
              <button
                key="logo"
                onClick={() => navigate('/')}
                className="w-12 h-12 bg-primary text-primary-foreground font-bold -mt-4 shadow-none text-sm text-center flex items-center justify-center rounded-full">

                w8ly
              </button>);

          }

          const isActive = location.pathname === tab.path;
          const Icon = tab.icon!;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>

              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>);

        })}
      </div>
    </nav>);

}