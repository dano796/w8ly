import { Outlet } from "react-router-dom";
import BottomTabBar from "./BottomTabBar";

export default function AppLayout() {
  return (
    <div
      className="min-h-screen bg-background"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 0px)",
        paddingBottom: "calc(5rem + max(env(safe-area-inset-bottom), 0px))",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <Outlet />
      <BottomTabBar />
    </div>
  );
}
