import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Smartphone } from "lucide-react";

export default function NFCStatusIndicator() {
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const checkNFCCapabilities = async () => {
      // Check Web NFC API support
      if ('NDEFReader' in window) {
        setIsNFCSupported(true);
        
        try {
          // Check permissions
          const permission = await navigator.permissions.query({ name: 'nfc' as any });
          setHasPermission(permission.state === 'granted');
        } catch (error) {
          console.warn('NFC permission check failed:', error);
          setHasPermission(false);
        }
      } else {
        setIsNFCSupported(false);
      }
    };

    checkNFCCapabilities();
  }, []);

  const getStatusInfo = () => {
    if (!isNFCSupported) {
      return {
        icon: WifiOff,
        text: "NFC Unavailable",
        variant: "destructive" as const,
        description: "Use QR codes instead"
      };
    }
    
    if (!hasPermission) {
      return {
        icon: Smartphone,
        text: "NFC Permission Required",
        variant: "secondary" as const,
        description: "Grant access to use Cirql tags"
      };
    }
    
    return {
      icon: Wifi,
      text: "NFC Ready",
      variant: "default" as const,
      description: "Can read/write Cirql tags"
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      <Badge variant={status.variant} className="text-xs">
        {status.text}
      </Badge>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {status.description}
      </span>
    </div>
  );
}