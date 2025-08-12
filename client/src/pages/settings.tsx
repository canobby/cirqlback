import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, 
  Globe, 
  Shield, 
  Palette, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  Eye,
  Download,
  Upload,
  Trash2,
  Settings,
  User,
  CreditCard,
  Lock
} from "lucide-react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    emailMarketing: true,
    pushNotifications: true,
    smsAlerts: false,
    weeklyReports: true,
    securityAlerts: true
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    shareLocation: false,
    dataAnalytics: true,
    personalizedAds: false
  });

  const { toast } = useToast();

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-gray-600 mt-1">Manage your account preferences and privacy settings</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-blue-500" />
                  Notification Preferences
                </CardTitle>
                <p className="text-gray-600">Choose when and how you want to be notified</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  {
                    key: 'emailMarketing',
                    title: 'Email Marketing',
                    description: 'Receive promotional emails and campaign updates',
                    icon: Mail
                  },
                  {
                    key: 'pushNotifications',
                    title: 'Push Notifications',
                    description: 'Get real-time alerts on your device',
                    icon: Smartphone
                  },
                  {
                    key: 'smsAlerts',
                    title: 'SMS Alerts',
                    description: 'Receive important updates via text message',
                    icon: MessageSquare
                  },
                  {
                    key: 'weeklyReports',
                    title: 'Weekly Reports',
                    description: 'Get weekly performance summaries',
                    icon: Download
                  },
                  {
                    key: 'securityAlerts',
                    title: 'Security Alerts',
                    description: 'Important security and account notifications',
                    icon: Shield
                  }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-gray-500" />
                        <div>
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications[item.key as keyof typeof notifications]}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, [item.key]: checked }))
                        }
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-green-500" />
                  Privacy Controls
                </CardTitle>
                <p className="text-gray-600">Control how your data is used and shared</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  {
                    key: 'profileVisible',
                    title: 'Public Profile',
                    description: 'Allow others to see your profile and achievements',
                    icon: User
                  },
                  {
                    key: 'shareLocation',
                    title: 'Location Sharing',
                    description: 'Share your location for personalized offers',
                    icon: Globe
                  },
                  {
                    key: 'dataAnalytics',
                    title: 'Usage Analytics',
                    description: 'Help improve the platform by sharing usage data',
                    icon: Eye
                  },
                  {
                    key: 'personalizedAds',
                    title: 'Personalized Advertising',
                    description: 'Show ads based on your interests and activity',
                    icon: Palette
                  }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-gray-500" />
                        <div>
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={privacy[item.key as keyof typeof privacy]}
                        onCheckedChange={(checked) => 
                          setPrivacy(prev => ({ ...prev, [item.key]: checked }))
                        }
                      />
                    </div>
                  );
                })}

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium text-red-600">Data Management</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      Export My Data
                    </Button>
                    <Button variant="outline" className="flex items-center text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2 text-purple-500" />
                  Appearance & Display
                </CardTitle>
                <p className="text-gray-600">Customize how the platform looks and feels</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Theme</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'light', name: 'Light', preview: 'bg-white border-2 border-gray-200' },
                      { id: 'dark', name: 'Dark', preview: 'bg-gray-900 border-2 border-gray-700' },
                      { id: 'auto', name: 'Auto', preview: 'bg-gradient-to-r from-white to-gray-900 border-2 border-gray-300' }
                    ].map((theme) => (
                      <div key={theme.id} className="text-center">
                        <div className={`w-full h-16 rounded-lg ${theme.preview} mb-2 cursor-pointer hover:scale-105 transition-transform`}></div>
                        <p className="text-sm font-medium">{theme.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Accessibility</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High contrast mode</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Reduced motion</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Large text</span>
                      <Switch />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Settings */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-orange-500" />
                  Connected Services
                </CardTitle>
                <p className="text-gray-600">Manage your third-party integrations</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  {
                    name: 'Google Analytics',
                    description: 'Track website and app performance',
                    connected: true,
                    icon: '📊'
                  },
                  {
                    name: 'Mailchimp',
                    description: 'Email marketing automation',
                    connected: true,
                    icon: '✉️'
                  },
                  {
                    name: 'Stripe',
                    description: 'Payment processing',
                    connected: false,
                    icon: '💳'
                  },
                  {
                    name: 'Twilio',
                    description: 'SMS messaging service',
                    connected: false,
                    icon: '📱'
                  },
                  {
                    name: 'Facebook Business',
                    description: 'Social media advertising',
                    connected: true,
                    icon: '📘'
                  }
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{service.icon}</span>
                      <div>
                        <h4 className="font-medium">{service.name}</h4>
                        <p className="text-sm text-gray-600">{service.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={service.connected ? "default" : "secondary"}>
                        {service.connected ? "Connected" : "Available"}
                      </Badge>
                      <Button variant="outline" size="sm">
                        {service.connected ? "Configure" : "Connect"}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-red-500" />
                  Security & Authentication
                </CardTitle>
                <p className="text-gray-600">Manage your account security settings</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Password</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input type="password" placeholder="Current password" />
                    <Input type="password" placeholder="New password" />
                  </div>
                  <Button>Update Password</Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="font-medium">SMS Authentication</h5>
                      <p className="text-sm text-gray-600">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Active Sessions</h4>
                  <div className="space-y-3">
                    {[
                      { device: 'Chrome on MacBook Pro', location: 'San Francisco, CA', current: true },
                      { device: 'Safari on iPhone', location: 'San Francisco, CA', current: false },
                      { device: 'Chrome on Windows', location: 'New York, NY', current: false }
                    ].map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{session.device}</p>
                          <p className="text-xs text-gray-600">{session.location}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {session.current && <Badge variant="default" className="text-xs">Current</Badge>}
                          {!session.current && (
                            <Button variant="outline" size="sm" className="text-red-600">
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button onClick={handleSaveSettings} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}