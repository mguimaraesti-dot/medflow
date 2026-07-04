export type DashboardAlertSeverity = "info" | "warning";

export interface DashboardAlert {
  code: string;
  severity: DashboardAlertSeverity;
  message: string;
}

export interface DashboardAlerts {
  alerts: DashboardAlert[];
}
