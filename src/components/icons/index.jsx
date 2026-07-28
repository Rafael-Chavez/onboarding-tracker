import {
  LayoutDashboard,
  DollarSign,
  Moon,
  Sun,
  Mail,
  Calendar,
  Settings,
  CheckCircle2,
  XCircle,
  Check,
  X,
  AlertCircle,
  Info,
  LogOut,
  TrendingUp,
  Users,
  Clock,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Send,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';

// Export all icons with consistent naming
export const Icons = {
  // Navigation
  Dashboard: LayoutDashboard,
  Sales: DollarSign,
  Moon: Moon,
  Sun: Sun,
  Mail: Mail,
  Calendar: Calendar,
  Settings: Settings,

  // Actions
  Check: Check,
  CheckCircle: CheckCircle2,
  X: X,
  XCircle: XCircle,
  Approve: CheckCircle2,
  Reject: XCircle,

  // Status
  Alert: AlertCircle,
  Info: Info,
  Success: CheckCircle2,
  Error: XCircle,

  // Auth
  Logout: LogOut,

  // Stats
  TrendingUp: TrendingUp,
  Users: Users,
  Clock: Clock,
  FileText: FileText,
  BarChart: BarChart3,

  // Navigation arrows
  ChevronLeft: ChevronLeft,
  ChevronRight: ChevronRight,

  // Misc
  Refresh: RefreshCw,
  Send: Send,
  Download: Download,
  Upload: Upload,
  Plus: Plus,
  Delete: Trash2,
  Edit: Edit,
  Eye: Eye,
  EyeOff: EyeOff,
};

// Default props for consistent icon sizing
export const iconProps = {
  size: 16,
  strokeWidth: 2,
};

export const iconPropsLg = {
  size: 20,
  strokeWidth: 2,
};

export const iconPropsXl = {
  size: 24,
  strokeWidth: 2,
};
