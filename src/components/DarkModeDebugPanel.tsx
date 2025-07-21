
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAutoDarkMode } from "@/hooks/useAutoDarkMode";
import { useTheme } from "next-themes";
import { Sun, Moon, Clock, Settings, X } from "lucide-react";

interface DarkModeDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DarkModeDebugPanel = ({ isOpen, onClose }: DarkModeDebugPanelProps) => {
  const { theme, resolvedTheme } = useTheme();
  const { 
    autoSettings, 
    userOverride, 
    isWithinDarkModeHours, 
    getThemeStatus, 
    getThemeIcon,
    toggleTheme,
    clearUserOverride
  } = useAutoDarkMode();

  if (!isOpen) return null;

  const status = getThemeStatus();
  const iconType = getThemeIcon();

  const getStatusColor = () => {
    if (userOverride) return 'bg-orange-500';
    if (status.isAuto) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (userOverride) return 'User Override Active';
    if (status.isAuto) return 'Auto Mode Active';
    return 'Manual Mode';
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="p-4 bg-card/95 backdrop-blur border shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Dark Mode Debug</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-3 text-xs">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
          
          {/* Current Theme */}
          <div className="flex items-center justify-between">
            <span>Set Theme:</span>
            <div className="flex items-center gap-1">
              <span className="capitalize">{theme}</span>
            </div>
          </div>
          
          {/* Resolved Theme */}
          <div className="flex items-center justify-between">
            <span>Active Theme:</span>
            <div className="flex items-center gap-1">
              {resolvedTheme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              <span className="capitalize">{resolvedTheme}</span>
            </div>
          </div>
          
          {/* Auto Settings */}
          <div className="flex items-center justify-between">
            <span>Auto Mode:</span>
            <Badge variant={autoSettings.enabled ? "default" : "secondary"}>
              {autoSettings.enabled ? 'ON' : 'OFF'}
            </Badge>
          </div>
          
          {/* Time Range */}
          {autoSettings.enabled && (
            <div className="flex items-center justify-between">
              <span>Dark Hours:</span>
              <span>{autoSettings.startTime} - {autoSettings.endTime}</span>
            </div>
          )}
          
          {/* Within Dark Hours */}
          {autoSettings.enabled && (
            <div className="flex items-center justify-between">
              <span>In Dark Hours:</span>
              <Badge variant={isWithinDarkModeHours ? "default" : "secondary"}>
                {isWithinDarkModeHours ? 'YES' : 'NO'}
              </Badge>
            </div>
          )}
          
          {/* User Override Info */}
          {userOverride && (
            <div className="space-y-1 p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
              <div className="flex items-center justify-between">
                <span>Override Theme:</span>
                <span className="capitalize">{userOverride.theme}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Expires In:</span>
                <span>{status.nextChange}</span>
              </div>
            </div>
          )}
          
          {/* Next Auto Change */}
          {status.isAuto && !userOverride && (
            <div className="flex items-center justify-between">
              <span>Next Change:</span>
              <span>{status.nextChange}</span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleTheme}
            className="flex-1"
          >
            {iconType === 'clock' && <Clock className="h-3 w-3 mr-1" />}
            {iconType === 'sun' && <Sun className="h-3 w-3 mr-1" />}
            {iconType === 'moon' && <Moon className="h-3 w-3 mr-1" />}
            {iconType === 'sun-override' && <Sun className="h-3 w-3 mr-1" />}
            {iconType === 'moon-override' && <Moon className="h-3 w-3 mr-1" />}
            Toggle
          </Button>
          
          {userOverride && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearUserOverride}
            >
              Clear Override
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
