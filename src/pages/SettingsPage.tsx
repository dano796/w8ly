import { useSettings } from "@/hooks/useSettings";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import {
  pageVariants,
  tapAnimation,
  listItemVariants,
} from "@/utils/animations";

function ChipSelector<T extends string | number>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => string;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o, idx) => (
        <motion.button
          key={String(o)}
          onClick={() => onChange(o)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            value === o
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border",
          )}
          whileTap={tapAnimation}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.05 }}
        >
          {renderLabel ? renderLabel(o) : String(o)}
        </motion.button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSetting } = useSettings();
  const { resetPlan } = useWeeklyPlan();

  return (
    <motion.div
      className="px-4 pt-6 max-w-lg mx-auto"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      <div className="space-y-4">
        {/* Dark mode */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm font-medium">Modo oscuro</span>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(v) => updateSetting("darkMode", v)}
            />
          </CardContent>
        </Card>

        {/* Default sets */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Series por defecto</p>
            <ChipSelector
              options={[2, 3, 4, 5]}
              value={settings.defaultSets}
              onChange={(v) => updateSetting("defaultSets", v)}
            />
          </CardContent>
        </Card>

        {/* Default unit */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Unidades por defecto</p>
            <ChipSelector
              options={["lbs" as const, "kg" as const]}
              value={settings.defaultUnit}
              onChange={(v) => updateSetting("defaultUnit", v)}
            />
          </CardContent>
        </Card>

        {/* Default rest time */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">
              Tiempo de descanso por defecto
            </p>
            <ChipSelector
              options={[1, 2, 3]}
              value={settings.defaultRestTime}
              onChange={(v) => updateSetting("defaultRestTime", v)}
              renderLabel={(v) => `${v}min`}
            />
          </CardContent>
        </Card>

        {/* Confirm on finish */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm font-medium">Confirmar al finalizar</span>
            <Switch
              checked={settings.confirmOnFinish}
              onCheckedChange={(v) => updateSetting("confirmOnFinish", v)}
            />
          </CardContent>
        </Card>

        {/* Reset */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              Restablecer planificación
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esto eliminará todos los ejercicios de tu planificación semanal.
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={resetPlan}>
                Restablecer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
}
