import { Outlet } from 'react-router';

export function AppShell() {
  return (
    <div className="h-full w-full flex flex-col">
      <Outlet />
    </div>
  );
}
