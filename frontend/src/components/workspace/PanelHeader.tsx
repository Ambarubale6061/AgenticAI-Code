import { type LucideIcon } from "lucide-react";

interface PanelHeaderProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  children?: React.ReactNode;
}

const PanelHeader = ({ title, icon: Icon, iconColor = "text-muted-foreground", children }: PanelHeaderProps) => (
  <div className="flex items-center justify-between px-3 py-2 bg-panel-header border-b border-panel-border shrink-0">
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
    </div>
    {children && <div className="flex items-center gap-1">{children}</div>}
  </div>
);

export default PanelHeader;
