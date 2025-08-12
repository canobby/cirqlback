import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Download, Bell, Wifi, WifiOff, Camera, MapPin, Vibrate } from "lucide-react";

export default function PWAFeatures() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  useEffect(() => {
    // Check if app is installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check permissions
    checkPermissions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPermissions = async () => {
    // Notification permission
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }

    // Location permission
    if ('geolocation' in navigator) {
      try {
        await navigator.geolocation.getCurrentPosition(() => {
          setLocationEnabled(true);
        });
      } catch {
        setLocationEnabled(false);
      }
    }

    // Camera permission
    if ('mediaDevices' in navigator) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameraEnabled(devices.some(device => device.kind === 'videoinput'));
      } catch {
        setCameraEnabled(false);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        new Notification('Cirqlback Notifications Enabled! 🎉', {
          body: 'You\'ll now receive rewards and updates instantly',
          icon: '/favicon.ico'
        });
      }
    }
  };

  const requestLocationPermission = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationEnabled(true),
        () => setLocationEnabled(false)
      );
    }
  };

  const installApp = () => {
    // This would trigger the install prompt in a real PWA
    alert('Install prompt would appear here in a real PWA environment');
  };

  const offlineFeatures = [
    { name: "View Rewards", available: true, description: "Access earned rewards offline" },
    { name: "Check Balance", available: true, description: "View loyalty points and tier status" },
    { name: "Browse Locations", available: true, description: "Find nearby businesses with cached data" },
    { name: "Tap History", available: true, description: "Review previous taps and rewards" },
    { name: "Claim Rewards", available: false, description: "Requires internet connection" },
    { name: "Social Sharing", available: false, description: "Needs online connectivity" }
  ];

  const mobileFeatures = [
    { 
      name: "Instant Tap Recognition", 
      icon: <Smartphone className="h-5 w-5" />,
      description: "NFC detection in under 200ms",
      status: "active"
    },
    {
      name: "Location-Based Rewards",
      icon: <MapPin className="h-5 w-5" />,
      description: "Automatic nearby business detection",
      status: locationEnabled ? "active" : "disabled"
    },
    {
      name: "Push Notifications",
      icon: <Bell className="h-5 w-5" />,
      description: "Real-time reward and campaign alerts",
      status: notificationsEnabled ? "active" : "disabled"
    },
    {
      name: "QR Code Scanner",
      icon: <Camera className="h-5 w-5" />,
      description: "Backup tap method when NFC unavailable",
      status: cameraEnabled ? "active" : "disabled"
    },
    {
      name: "Haptic Feedback",
      icon: <Vibrate className="h-5 w-5" />,
      description: "Physical confirmation for successful taps",
      status: "active"
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="card-hover glow-effect">
        <CardHeader>
          <CardTitle className="flex items-center gradient-text">
            <Smartphone className="mr-2 h-6 w-6" />
            Mobile App Experience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {isInstalled ? (
                  <Badge className="gradient-bg border-0 text-white">Installed</Badge>
                ) : (
                  <Badge variant="outline">Browser</Badge>
                )}
              </div>
              <div className="text-sm text-blue-700">App Status</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {isOnline ? (
                  <Wifi className="h-6 w-6 text-green-600" />
                ) : (
                  <WifiOff className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="text-sm text-green-700">
                {isOnline ? "Online" : "Offline"}
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {mobileFeatures.filter(f => f.status === "active").length}
              </div>
              <div className="text-sm text-purple-700">Active Features</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">&lt; 200ms</div>
              <div className="text-sm text-orange-700">Tap Response</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="gradient-text">Mobile Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mobileFeatures.map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {feature.icon}
                  <div>
                    <div className="font-semibold text-gray-900">{feature.name}</div>
                    <div className="text-sm text-gray-600">{feature.description}</div>
                  </div>
                </div>
                <Badge variant={feature.status === "active" ? "default" : "secondary"}>
                  {feature.status}
                </Badge>
              </div>
            ))}
            
            {!isInstalled && (
              <Button onClick={installApp} className="w-full gradient-bg border-0 text-white">
                <Download className="mr-2 h-4 w-4" />
                Install App
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="gradient-text">Offline Capabilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {offlineFeatures.map((feature, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{feature.name}</div>
                  <div className="text-sm text-gray-600">{feature.description}</div>
                </div>
                <div className="flex items-center">
                  {feature.available ? (
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  ) : (
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📱 Offline Benefits</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div>• Always accessible rewards</div>
                <div>• Cached business locations</div>
                <div>• Syncs when back online</div>
                <div>• No data loss during outages</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="gradient-text">Permissions & Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
              <Bell className="h-8 w-8 mx-auto mb-3 text-purple-500" />
              <h4 className="font-semibold mb-2">Notifications</h4>
              <p className="text-sm text-gray-600 mb-4">Get instant alerts for rewards and special offers</p>
              {notificationsEnabled ? (
                <Badge className="gradient-bg border-0 text-white">Enabled</Badge>
              ) : (
                <Button onClick={requestNotificationPermission} size="sm" variant="outline">
                  Enable Notifications
                </Button>
              )}
            </div>

            <div className="text-center p-6 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
              <MapPin className="h-8 w-8 mx-auto mb-3 text-blue-500" />
              <h4 className="font-semibold mb-2">Location Access</h4>
              <p className="text-sm text-gray-600 mb-4">Find nearby businesses and location-based rewards</p>
              {locationEnabled ? (
                <Badge className="gradient-bg border-0 text-white">Enabled</Badge>
              ) : (
                <Button onClick={requestLocationPermission} size="sm" variant="outline">
                  Enable Location
                </Button>
              )}
            </div>

            <div className="text-center p-6 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
              <Camera className="h-8 w-8 mx-auto mb-3 text-green-500" />
              <h4 className="font-semibold mb-2">Camera Access</h4>
              <p className="text-sm text-gray-600 mb-4">Scan QR codes when NFC is unavailable</p>
              {cameraEnabled ? (
                <Badge className="gradient-bg border-0 text-white">Available</Badge>
              ) : (
                <Badge variant="secondary">Not Available</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="gradient-text">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">98%</div>
              <div className="text-sm text-green-700">App Store Rating</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">1.2MB</div>
              <div className="text-sm text-blue-700">App Size</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">0.8s</div>
              <div className="text-sm text-purple-700">Load Time</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
              <div className="text-lg font-bold text-orange-600">99.9%</div>
              <div className="text-sm text-orange-700">Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}