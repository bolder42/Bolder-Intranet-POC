export interface DashboardHeaderProps {
  userName?: string | null;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <div className="dashboard-header-title">
      <h1 className="dashboard-title">Dashboard</h1>
      <p className="dashboard-meta">
        Welcome back, {userName ?? 'there'}
      </p>
    </div>
  );
}