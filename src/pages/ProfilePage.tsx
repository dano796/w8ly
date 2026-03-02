import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Profile } from "@/utils/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { pageVariants, scaleInVariants } from "@/utils/animations";

export default function ProfilePage() {
  const [profile, setProfile] = useLocalStorage<Profile>("w8ly-profile", {
    name: "",
    email: "",
  });
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const handleSave = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "Nombre requerido";
    if (!email.trim()) newErrors.email = "Email requerido";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Email inválido";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setProfile({ name: name.trim(), email: email.trim() });
    toast.success("Perfil guardado");
  };

  return (
    <motion.div
      className="px-4 pt-6 max-w-lg mx-auto"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <h1 className="text-2xl font-bold mb-6">Perfil</h1>
      <motion.div
        variants={scaleInVariants}
        initial="initial"
        animate="animate"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>
            <Button onClick={handleSave} className="w-full">
              Guardar
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
