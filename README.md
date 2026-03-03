# W8ly - Workout Planner 💪

**W8ly** es una aplicación web progresiva (PWA) diseñada para planificar y registrar tus entrenamientos semanales de forma completamente offline. Gestiona tu rutina de gimnasio, explora ejercicios y realiza seguimiento de tu progreso, todo desde tu dispositivo móvil o desktop.

## ✨ Características

### 🗓️ Planificador Semanal

- **Organización por días**: Estructura tu rutina semanal con ejercicios personalizados para cada día
- **Drag & Drop**: Arrastra y suelta ejercicios entre días o desde la biblioteca
- **Etiquetas personalizadas**: Nombra tus rutinas (Ej: "Torso A", "Pierna", "Pull Day")
- **Interfaz estilo Trello**: Scroll horizontal intuitivo para navegar entre días

### 📚 Biblioteca de Ejercicios

- **Catálogo completo**: Más de 50 ejercicios pre-cargados
- **Filtros por grupo muscular**: Encuentra ejercicios por pecho, espalda, piernas, hombros, brazos y core
- **Búsqueda rápida**: Localiza ejercicios por nombre instantáneamente
- **Información detallada**: Equipamiento, dificultad y grupo muscular de cada ejercicio

### 🏃 Modo Entrenamiento Activo

- **Timer integrado**: Cronometro de descanso entre series con alertas visuales
- **Registro de progreso**: Guarda el peso y repeticiones de cada serie
- **Control de tiempo de descanso**: Configurable desde 30 segundos hasta 5 minutos
- **Registro automático al finalizar**: Historial guardado en tu dispositivo

### 📊 Historial y Estadísticas

- **Resumen post-entrenamiento**: Revisa el detalle completo de cada sesión
- **Registro histórico**: Consulta tus entrenamientos anteriores por fecha
- **Tendencias de progreso**: Visualiza tu evolución en cada ejercicio
- **Datos locales**: Todo se guarda en tu dispositivo, 100% privado

### ⚙️ Configuración Personalizada

- **Ajustes predeterminados**: Series, repeticiones y tiempo de descanso configurables
- **Unidades de medida**: Cambia entre kg/lb según tu preferencia
- **Tema oscuro/claro**: Interfaz adaptable a tus preferencias visuales
- **PWA instalable**: Instala la app en tu dispositivo para acceso rápido

### 🔒 Offline-First

- **Funciona sin internet**: Toda la funcionalidad disponible offline
- **Almacenamiento local**: Datos guardados en LocalStorage
- **Service Worker**: Caché de recursos para carga instantánea
- **Sin registro ni login**: Privacidad total, tus datos nunca salen de tu dispositivo

## 🛠️ Tecnologías

Este proyecto está construido con tecnologías modernas:

- **[Vite](https://vitejs.dev/)** - Build tool ultrarrápido
- **[React 18](https://react.dev/)** - Biblioteca UI con TypeScript
- **[TypeScript](https://www.typescriptlang.org/)** - Tipado estático
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework de estilos utility-first
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes UI accesibles y personalizables
- **[Framer Motion](https://www.framer.com/motion/)** - Animaciones fluidas
- **[React Router](https://reactrouter.com/)** - Navegación SPA
- **[Sonner](https://sonner.emilkowal.ski/)** - Sistema de notificaciones toast
- **[date-fns](https://date-fns.org/)** - Manipulación de fechas

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 18 o superior)
- **npm** o **bun** (instalado con Node.js)

> 💡 **Recomendación**: Instala Node.js usando [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) para gestionar múltiples versiones fácilmente.

## 🚀 Instalación y Ejecución

### 1. Clonar el repositorio

```bash
git clone <YOUR_GIT_URL>
cd offline-workout-planner
```

### 2. Instalar dependencias

```bash
npm install
```

O si usas bun:

```bash
bun install
```

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

O con bun:

```bash
bun run dev
```

La aplicación estará disponible en `http://localhost:5173`

### 4. Compilar para producción

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`

### 5. Vista previa de la build de producción

```bash
npm run preview
```

## 📱 Instalación como PWA

1. Abre la aplicación en tu navegador móvil (Chrome, Safari, Edge)
2. Busca la opción "Añadir a pantalla de inicio" o "Instalar"
3. Confirma la instalación
4. Accede a W8ly como una app nativa desde tu pantalla de inicio

## 🤝 Contribuir

Las contribuciones son bienvenidas. Si encuentras un bug o tienes una sugerencia:

1. Crea un fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👤 Autor

Desarrollado con ❤️ para la comunidad fitness

---

**¿Te gusta W8ly?** Dale una ⭐ al repositorio y compártelo con tus compañeros de gimnasio!
