import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  UserPlus, 
  Mail, 
  Shield, 
  Clock, 
  CheckCircle, 
  X, 
  Send, 
  Users, 
  Settings,
  Award,
  MessageSquare,
  AlertTriangle,
  Eye,
  Trash2
} from "lucide-react";

export default function AdminInvitations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isCommunicationDialogOpen, setIsCommunicationDialogOpen] = useState(false);

  const { data: adminUsers, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: pendingInvitations } = useQuery({
    queryKey: ["/api/admin/invitations/pending"],
  });

  const { data: communications } = useQuery({
    queryKey: ["/api/admin/communications"],
  });

  const [inviteForm, setInviteForm] = useState({
    email: "",
    adminLevel: "platform",
    specializations: [],
    personalMessage: "",
    emergencyContact: {
      name: "",
      phone: "",
      email: ""
    }
  });

  const [communicationForm, setCommunicationForm] = useState({
    recipientType: "specific", // specific, role, level, all
    recipientId: "",
    recipientRole: "",
    recipientLevel: "",
    type: "announcement",
    priority: "normal",
    subject: "",
    content: "",
    requiresAcknowledgment: false,
    actionRequired: "",
    expiresAt: ""
  });

  const inviteAdminMutation = useMutation({
    mutationFn: (inviteData: typeof inviteForm) => 
      apiRequest("POST", "/api/admin/invite", inviteData),
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Admin invitation has been sent successfully.",
      });
      setIsInviteDialogOpen(false);
      setInviteForm({
        email: "",
        adminLevel: "platform",
        specializations: [],
        personalMessage: "",
        emergencyContact: { name: "", phone: "", email: "" }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations/pending"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendCommunicationMutation = useMutation({
    mutationFn: (commData: typeof communicationForm) =>
      apiRequest("POST", "/api/admin/communications/send", commData),
    onSuccess: () => {
      toast({
        title: "Communication Sent",
        description: "Message has been delivered to selected recipients.",
      });
      setIsCommunicationDialogOpen(false);
      setCommunicationForm({
        recipientType: "specific",
        recipientId: "",
        recipientRole: "",
        recipientLevel: "",
        type: "announcement",
        priority: "normal",
        subject: "",
        content: "",
        requiresAcknowledgment: false,
        actionRequired: "",
        expiresAt: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/communications"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send communication. Please try again.",
        variant: "destructive",
      });
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiRequest("DELETE", `/api/admin/invitations/${inviteId}`),
    onSuccess: () => {
      toast({
        title: "Invitation Revoked",
        description: "The invitation has been successfully revoked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitations/pending"] });
    },
  });

  const updateAdminStatusMutation = useMutation({
    mutationFn: ({ adminId, isActive }: { adminId: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${adminId}/status`, { isActive }),
    onSuccess: () => {
      toast({
        title: "Admin Status Updated",
        description: "Administrator status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const adminLevels = [
    { value: "master", label: "Master Admin", description: "Full platform control" },
    { value: "platform", label: "Platform Admin", description: "User and business management" },
    { value: "support", label: "Support Admin", description: "Customer support and basic management" }
  ];

  const specializationOptions = [
    "user_management",
    "campaign_oversight", 
    "technical_support",
    "content_moderation",
    "analytics_reporting",
    "business_relations"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Admin Management Center
            </h1>
            <p className="text-gray-600 mt-2">Invite, train, and manage platform administrators</p>
          </div>
          
          <div className="flex space-x-3">
            <Dialog open={isCommunicationDialogOpen} onOpenChange={setIsCommunicationDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Communication
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Send Admin Communication</DialogTitle>
                  <DialogDescription>
                    Send messages, announcements, or training updates to administrators
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Recipient Type</Label>
                      <Select 
                        value={communicationForm.recipientType} 
                        onValueChange={(value) => setCommunicationForm({
                          ...communicationForm, 
                          recipientType: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="specific">Specific Admin</SelectItem>
                          <SelectItem value="role">All of Role</SelectItem>
                          <SelectItem value="level">Certification Level</SelectItem>
                          <SelectItem value="all">All Admins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Priority</Label>
                      <Select 
                        value={communicationForm.priority} 
                        onValueChange={(value) => setCommunicationForm({
                          ...communicationForm, 
                          priority: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Subject</Label>
                    <Input 
                      placeholder="Communication subject..."
                      value={communicationForm.subject}
                      onChange={(e) => setCommunicationForm({
                        ...communicationForm,
                        subject: e.target.value
                      })}
                    />
                  </div>

                  <div>
                    <Label>Message Content</Label>
                    <Textarea 
                      placeholder="Enter your message content..."
                      className="min-h-32"
                      value={communicationForm.content}
                      onChange={(e) => setCommunicationForm({
                        ...communicationForm,
                        content: e.target.value
                      })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="requires-ack"
                      checked={communicationForm.requiresAcknowledgment}
                      onCheckedChange={(checked) => setCommunicationForm({
                        ...communicationForm,
                        requiresAcknowledgment: checked
                      })}
                    />
                    <Label htmlFor="requires-ack">Requires acknowledgment</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCommunicationDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => sendCommunicationMutation.mutate(communicationForm)}
                      disabled={sendCommunicationMutation.isPending || !communicationForm.subject || !communicationForm.content}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendCommunicationMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Invite New Administrator</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join the admin team with training requirements
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label>Email Address</Label>
                    <Input 
                      type="email"
                      placeholder="admin@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({
                        ...inviteForm,
                        email: e.target.value
                      })}
                    />
                  </div>

                  <div>
                    <Label>Admin Level</Label>
                    <Select 
                      value={inviteForm.adminLevel} 
                      onValueChange={(value) => setInviteForm({
                        ...inviteForm, 
                        adminLevel: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {adminLevels.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            <div>
                              <div className="font-medium">{level.label}</div>
                              <div className="text-sm text-gray-500">{level.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Specializations</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {specializationOptions.map(spec => (
                        <div key={spec} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={spec}
                            checked={inviteForm.specializations.includes(spec)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteForm({
                                  ...inviteForm,
                                  specializations: [...inviteForm.specializations, spec]
                                });
                              } else {
                                setInviteForm({
                                  ...inviteForm,
                                  specializations: inviteForm.specializations.filter(s => s !== spec)
                                });
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={spec} className="text-sm capitalize">
                            {spec.replace('_', ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Personal Message (Optional)</Label>
                    <Textarea 
                      placeholder="Welcome message for the new admin..."
                      value={inviteForm.personalMessage}
                      onChange={(e) => setInviteForm({
                        ...inviteForm,
                        personalMessage: e.target.value
                      })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Emergency Contact Information</Label>
                    <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-lg">
                      <Input 
                        placeholder="Full name"
                        value={inviteForm.emergencyContact.name}
                        onChange={(e) => setInviteForm({
                          ...inviteForm,
                          emergencyContact: {
                            ...inviteForm.emergencyContact,
                            name: e.target.value
                          }
                        })}
                      />
                      <Input 
                        placeholder="Phone number"
                        value={inviteForm.emergencyContact.phone}
                        onChange={(e) => setInviteForm({
                          ...inviteForm,
                          emergencyContact: {
                            ...inviteForm.emergencyContact,
                            phone: e.target.value
                          }
                        })}
                      />
                      <Input 
                        type="email"
                        placeholder="Emergency contact email"
                        value={inviteForm.emergencyContact.email}
                        onChange={(e) => setInviteForm({
                          ...inviteForm,
                          emergencyContact: {
                            ...inviteForm.emergencyContact,
                            email: e.target.value
                          }
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => inviteAdminMutation.mutate(inviteForm)}
                      disabled={inviteAdminMutation.isPending || !inviteForm.email}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {inviteAdminMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="admins" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-4 min-w-max lg:w-full">
              <TabsTrigger value="admins" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Admins</span>
              </TabsTrigger>
              <TabsTrigger value="invitations" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Mail className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Invitations</span>
              </TabsTrigger>
              <TabsTrigger value="training" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Award className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Training</span>
              </TabsTrigger>
              <TabsTrigger value="communications" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <MessageSquare className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Communications</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="admins">
            <div className="grid gap-4">
              {adminUsers?.map((admin: any) => (
                <Card key={admin.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{admin.user?.email || admin.invitationEmail}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={admin.adminLevel === 'master' ? 'default' : 'secondary'}>
                            {admin.adminLevel} admin
                          </Badge>
                          <Badge variant={admin.trainingStatus === 'completed' ? 'default' : 'outline'}>
                            {admin.trainingStatus === 'completed' ? 'Certified' : 'Training Required'}
                          </Badge>
                          <Badge variant={admin.isActive ? 'default' : 'destructive'}>
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          Specializations: {admin.specializations?.join(', ') || 'None'}
                        </div>
                        {admin.lastActiveAt && (
                          <div className="text-sm text-gray-500">
                            Last active: {new Date(admin.lastActiveAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateAdminStatusMutation.mutate({
                          adminId: admin.id,
                          isActive: !admin.isActive
                        })}
                      >
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="invitations">
            <div className="grid gap-4">
              {pendingInvitations?.length === 0 ? (
                <Card className="p-8 text-center">
                  <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Invitations</h3>
                  <p className="text-gray-500">All admin invitations have been accepted or expired.</p>
                </Card>
              ) : (
                pendingInvitations?.map((invitation: any) => (
                  <Card key={invitation.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{invitation.invitationEmail}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{invitation.adminLevel} admin</Badge>
                            <Badge variant="secondary">Pending</Badge>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Invited: {new Date(invitation.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            Expires: {new Date(invitation.inviteExpiresAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Resend invitation logic
                          }}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Resend
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => revokeInvitationMutation.mutate(invitation.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="training">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Training Progress Overview</h3>
              <div className="text-gray-500">
                Training progress tracking will be displayed here once admins begin their certification process.
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="communications">
            <div className="grid gap-4">
              {communications?.map((comm: any) => (
                <Card key={comm.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        comm.priority === 'emergency' ? 'bg-red-100' :
                        comm.priority === 'urgent' ? 'bg-orange-100' :
                        comm.priority === 'high' ? 'bg-yellow-100' :
                        'bg-blue-100'
                      }`}>
                        {comm.priority === 'emergency' ? <AlertTriangle className="h-5 w-5 text-red-600" /> :
                         comm.type === 'training_update' ? <Award className="h-5 w-5 text-blue-600" /> :
                         <MessageSquare className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{comm.subject}</h4>
                          <Badge variant={
                            comm.priority === 'emergency' ? 'destructive' :
                            comm.priority === 'urgent' ? 'destructive' :
                            comm.priority === 'high' ? 'secondary' :
                            'outline'
                          }>
                            {comm.priority}
                          </Badge>
                          {comm.requiresAcknowledgment && (
                            <Badge variant="outline">Requires Ack</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{comm.content}</p>
                        <div className="text-xs text-gray-500">
                          Sent: {new Date(comm.createdAt).toLocaleString()}
                          {comm.expiresAt && (
                            <span> • Expires: {new Date(comm.expiresAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )) || (
                <Card className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Communications</h3>
                  <p className="text-gray-500">No admin communications have been sent yet.</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}