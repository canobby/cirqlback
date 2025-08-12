import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Video, 
  Phone, 
  MessageSquare, 
  Send, 
  Users, 
  Mic, 
  MicOff, 
  VideoOff,
  PhoneOff,
  UserPlus,
  Clock,
  CheckCircle2
} from "lucide-react";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: "text" | "audio" | "video" | "file";
  status: "sent" | "delivered" | "read";
}

interface CommunicationChannel {
  id: string;
  name: string;
  type: "direct" | "group" | "campaign" | "testing";
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
}

interface CommunicationHubProps {
  context: "testing" | "merchant" | "customer";
  channelId?: string;
}

export default function CommunicationHub({ context, channelId }: CommunicationHubProps) {
  const { toast } = useToast();
  const [activeChannel, setActiveChannel] = useState<string | null>(channelId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isAudioCallActive, setIsAudioCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [channels] = useState<CommunicationChannel[]>([
    {
      id: "testing-main",
      name: "Testing Partnership",
      type: "testing",
      participants: ["admin", "partner"],
      unreadCount: 0,
      lastMessage: {
        id: "1",
        senderId: "partner",
        senderName: "Testing Partner",
        content: "Ready to start testing the platform!",
        timestamp: new Date(),
        type: "text",
        status: "read"
      }
    },
    {
      id: "merchants-general",
      name: "Merchant Collaboration",
      type: "group",
      participants: ["merchant1", "merchant2", "merchant3"],
      unreadCount: 2,
      lastMessage: {
        id: "2",
        senderId: "merchant2",
        senderName: "Summit Outdoor Gear",
        content: "Cross-promotion campaign looks great!",
        timestamp: new Date(Date.now() - 300000),
        type: "text",
        status: "delivered"
      }
    },
    {
      id: "campaign-winter",
      name: "Winter Campaign Planning",
      type: "campaign",
      participants: ["merchant1", "merchant2"],
      unreadCount: 1,
      lastMessage: {
        id: "3",
        senderId: "merchant1",
        senderName: "Grind Coffee Co.",
        content: "Audio message about seasonal strategy",
        timestamp: new Date(Date.now() - 600000),
        type: "audio",
        status: "sent"
      }
    }
  ]);

  useEffect(() => {
    // Initialize WebSocket connection
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/communication`;
      
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        console.log('Communication WebSocket connected');
      };
      
      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      websocketRef.current.onclose = () => {
        console.log('Communication WebSocket disconnected');
      };
    }

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'message':
        setMessages(prev => [...prev, data.message]);
        break;
      case 'call-offer':
        handleCallOffer(data);
        break;
      case 'call-answer':
        handleCallAnswer(data);
        break;
      case 'ice-candidate':
        handleIceCandidate(data);
        break;
      case 'user-status':
        setOnlineUsers(data.onlineUsers);
        break;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChannel) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: "current-user",
      senderName: "You",
      content: newMessage,
      timestamp: new Date(),
      type: "text",
      status: "sent"
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");

    // Send via WebSocket
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'message',
        channelId: activeChannel,
        message
      }));
    }

    toast({
      title: "Message Sent",
      description: "Your message has been delivered"
    });
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsVideoCallActive(true);
      setupPeerConnection(stream);

      toast({
        title: "Video Call Started",
        description: "Connecting to participants..."
      });
    } catch (error) {
      toast({
        title: "Camera Access Required",
        description: "Please allow camera and microphone access to start video calls",
        variant: "destructive"
      });
    }
  };

  const startAudioCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: false, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      setIsAudioCallActive(true);
      setupPeerConnection(stream);

      toast({
        title: "Audio Call Started",
        description: "Connecting to participants..."
      });
    } catch (error) {
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to start audio calls",
        variant: "destructive"
      });
    }
  };

  const setupPeerConnection = (stream: MediaStream) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    peerConnectionRef.current = new RTCPeerConnection(configuration);
    
    stream.getTracks().forEach(track => {
      peerConnectionRef.current?.addTrack(track, stream);
    });

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          channelId: activeChannel
        }));
      }
    };
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    setIsVideoCallActive(false);
    setIsAudioCallActive(false);
    setIsMuted(false);
    setIsVideoEnabled(true);

    toast({
      title: "Call Ended",
      description: "The call has been disconnected"
    });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const handleCallOffer = async (data: any) => {
    // Handle incoming call offer
    const accept = window.confirm(`Incoming ${data.callType} call. Accept?`);
    if (accept) {
      if (data.callType === 'video') {
        await startVideoCall();
      } else {
        await startAudioCall();
      }
    }
  };

  const handleCallAnswer = (data: any) => {
    // Handle call answer
    if (peerConnectionRef.current) {
      peerConnectionRef.current.setRemoteDescription(data.answer);
    }
  };

  const handleIceCandidate = (data: any) => {
    // Handle ICE candidate
    if (peerConnectionRef.current) {
      peerConnectionRef.current.addIceCandidate(data.candidate);
    }
  };

  const getContextTitle = () => {
    switch (context) {
      case "testing": return "Testing Communication Hub";
      case "merchant": return "Merchant Collaboration Hub";
      case "customer": return "Customer Support Hub";
      default: return "Communication Hub";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <h2 className="text-xl font-semibold">{getContextTitle()}</h2>
        <div className="flex items-center space-x-2 mt-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {onlineUsers.length} Online
          </Badge>
          {(isVideoCallActive || isAudioCallActive) && (
            <Badge className="bg-blue-600">
              {isVideoCallActive ? "Video Call Active" : "Audio Call Active"}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Channels Sidebar */}
        <div className="w-80 border-r bg-gray-50 p-4">
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700">Channels</h3>
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => setActiveChannel(channel.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  activeChannel === channel.id 
                    ? "bg-blue-100 border-blue-200" 
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{channel.name}</h4>
                      {channel.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs">
                          {channel.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {channel.lastMessage && (
                      <p className="text-sm text-gray-600 truncate">
                        {channel.lastMessage.senderName}: {channel.lastMessage.content}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {channel.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Communication Area */}
        <div className="flex-1 flex flex-col">
          {activeChannel ? (
            <>
              {/* Call Controls */}
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {channels.find(c => c.id === activeChannel)?.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {!isVideoCallActive && !isAudioCallActive && (
                      <>
                        <Button onClick={startAudioCall} size="sm" variant="outline">
                          <Phone className="h-4 w-4 mr-2" />
                          Audio Call
                        </Button>
                        <Button onClick={startVideoCall} size="sm">
                          <Video className="h-4 w-4 mr-2" />
                          Video Call
                        </Button>
                      </>
                    )}
                    
                    {(isVideoCallActive || isAudioCallActive) && (
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={toggleMute} 
                          size="sm" 
                          variant={isMuted ? "destructive" : "outline"}
                        >
                          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                        
                        {isVideoCallActive && (
                          <Button 
                            onClick={toggleVideo} 
                            size="sm" 
                            variant={!isVideoEnabled ? "destructive" : "outline"}
                          >
                            {!isVideoEnabled ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                          </Button>
                        )}
                        
                        <Button onClick={endCall} size="sm" variant="destructive">
                          <PhoneOff className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Video Call Area */}
              {isVideoCallActive && (
                <div className="p-4 bg-black">
                  <div className="grid grid-cols-2 gap-4 h-64">
                    <div className="relative">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                        Remote
                      </div>
                    </div>
                    <div className="relative">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                        You
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === "current-user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === "current-user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium">{message.senderName}</span>
                          <span className="text-xs opacity-75">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-end mt-1">
                          {message.status === "sent" && <Clock className="h-3 w-3 opacity-50" />}
                          {message.status === "delivered" && <CheckCircle2 className="h-3 w-3 opacity-50" />}
                          {message.status === "read" && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-white">
                <div className="flex items-center space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a channel to start communicating</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}