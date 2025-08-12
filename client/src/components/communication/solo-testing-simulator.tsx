import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  User, 
  MessageSquare, 
  Video, 
  Phone, 
  Settings, 
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Zap
} from "lucide-react";

interface SimulatedMessage {
  id: string;
  sender: "you" | "partner";
  content: string;
  timestamp: Date;
  type: "text" | "system";
}

interface TestingScenario {
  id: string;
  name: string;
  description: string;
  messages: Omit<SimulatedMessage, "id" | "timestamp">[];
  duration: number; // seconds between messages
}

const testingScenarios: TestingScenario[] = [
  {
    id: "initial-coordination",
    name: "Initial Partnership Coordination",
    description: "Simulate first-time partner communication setup",
    duration: 3,
    messages: [
      { sender: "partner", content: "Hi! I'm ready to start our testing partnership. Are you online?", type: "text" },
      { sender: "you", content: "Yes, I'm here! Let's coordinate our testing approach.", type: "text" },
      { sender: "partner", content: "Great! Should we start with the campaign testing or business verification first?", type: "text" },
      { sender: "you", content: "Let's begin with campaign testing. I'll test the coffee shop scenario.", type: "text" },
      { sender: "partner", content: "Perfect! I'll focus on the restaurant campaigns. Let me know when you're ready.", type: "text" }
    ]
  },
  {
    id: "active-testing",
    name: "Active Testing Collaboration",
    description: "Simulate real-time testing coordination",
    duration: 2,
    messages: [
      { sender: "partner", content: "I just completed the loyalty program test. Results look good!", type: "text" },
      { sender: "you", content: "Excellent! I'm testing the AR experience now. The tap response is working perfectly.", type: "text" },
      { sender: "partner", content: "Can you try the payment flow? I want to verify it from my end too.", type: "text" },
      { sender: "you", content: "Sure! Testing checkout process now...", type: "text" },
      { sender: "partner", content: "I see your test transaction. Everything processed correctly!", type: "text" }
    ]
  },
  {
    id: "issue-resolution",
    name: "Issue Discovery & Resolution",
    description: "Simulate collaborative problem-solving",
    duration: 4,
    messages: [
      { sender: "partner", content: "I'm getting an error on the map view. Are you seeing the same issue?", type: "text" },
      { sender: "you", content: "Let me check... Yes, I see it too. Looks like a location services issue.", type: "text" },
      { sender: "partner", content: "Should we report this or try to troubleshoot together first?", type: "text" },
      { sender: "you", content: "Let's try a browser refresh and test again.", type: "text" },
      { sender: "partner", content: "That fixed it! Map is loading correctly now. Good catch!", type: "text" }
    ]
  },
  {
    id: "results-sharing",
    name: "Results & Insights Sharing",
    description: "Simulate end-of-testing discussion",
    duration: 3,
    messages: [
      { sender: "partner", content: "I've completed all my test scenarios. Ready to compare results?", type: "text" },
      { sender: "you", content: "Yes! I found the checkout flow works great, but we should suggest UX improvements for mobile.", type: "text" },
      { sender: "partner", content: "Agreed! I noticed the same thing. The AR features are impressive though.", type: "text" },
      { sender: "you", content: "Definitely. Should we schedule a call to discuss our findings in detail?", type: "text" },
      { sender: "partner", content: "Perfect! How about 2 PM? I'll prepare my testing notes.", type: "text" }
    ]
  }
];

interface SoloTestingSimulatorProps {
  onMessageReceived?: (message: SimulatedMessage) => void;
}

export default function SoloTestingSimulator({ onMessageReceived }: SoloTestingSimulatorProps) {
  const { toast } = useToast();
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<TestingScenario | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [simulatedMessages, setSimulatedMessages] = useState<SimulatedMessage[]>([]);
  const [autoRespond, setAutoRespond] = useState(true);
  const [responseDelay, setResponseDelay] = useState(3);
  const [partnerOnlineStatus, setPartnerOnlineStatus] = useState(false);

  // Auto-advance messages in simulation
  useEffect(() => {
    if (!isSimulationActive || !currentScenario || messageIndex >= currentScenario.messages.length) {
      return;
    }

    const timer = setTimeout(() => {
      const messageTemplate = currentScenario.messages[messageIndex];
      const newMessage: SimulatedMessage = {
        id: `sim-${Date.now()}-${messageIndex}`,
        ...messageTemplate,
        timestamp: new Date()
      };

      setSimulatedMessages(prev => [...prev, newMessage]);
      onMessageReceived?.(newMessage);
      setMessageIndex(prev => prev + 1);

      // Show toast for partner messages
      if (messageTemplate.sender === "partner") {
        toast({
          title: "New message from testing partner",
          description: messageTemplate.content.substring(0, 50) + "...",
        });
      }
    }, currentScenario.duration * 1000);

    return () => clearTimeout(timer);
  }, [isSimulationActive, currentScenario, messageIndex, onMessageReceived, toast]);

  const startScenario = (scenario: TestingScenario) => {
    setCurrentScenario(scenario);
    setMessageIndex(0);
    setSimulatedMessages([]);
    setIsSimulationActive(true);
    setPartnerOnlineStatus(true);
    
    toast({
      title: "Testing simulation started",
      description: `Simulating: ${scenario.name}`,
    });
  };

  const stopSimulation = () => {
    setIsSimulationActive(false);
    setPartnerOnlineStatus(false);
    setCurrentScenario(null);
    setMessageIndex(0);
  };

  const resetSimulation = () => {
    setSimulatedMessages([]);
    setMessageIndex(0);
    if (currentScenario) {
      setIsSimulationActive(true);
    }
  };

  const simulateCall = (type: "audio" | "video") => {
    toast({
      title: `Simulated ${type} call started`,
      description: "Partner accepted the call. Testing communication quality...",
    });

    // Simulate call duration
    setTimeout(() => {
      toast({
        title: `${type} call ended`,
        description: "Call quality was excellent. Communication test successful!",
      });
    }, 5000);
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-blue-600" />
            Solo Communication Testing Simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Partner Status Simulation */}
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${partnerOnlineStatus ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="font-medium">Testing Partner (Simulated)</span>
              <Badge variant={partnerOnlineStatus ? "default" : "secondary"}>
                {partnerOnlineStatus ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => simulateCall("audio")} 
                variant="outline" 
                size="sm"
                disabled={!partnerOnlineStatus}
              >
                <Phone className="h-4 w-4 mr-2" />
                Test Audio Call
              </Button>
              <Button 
                onClick={() => simulateCall("video")} 
                variant="outline" 
                size="sm"
                disabled={!partnerOnlineStatus}
              >
                <Video className="h-4 w-4 mr-2" />
                Test Video Call
              </Button>
            </div>
          </div>

          {/* Simulation Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Simulation Settings</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-respond" className="text-sm">Auto-respond as partner</Label>
                <Switch 
                  id="auto-respond"
                  checked={autoRespond} 
                  onCheckedChange={setAutoRespond} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Response delay (seconds)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="10" 
                  value={responseDelay}
                  onChange={(e) => setResponseDelay(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Simulation Status</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`h-4 w-4 ${isSimulationActive ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-sm">
                    {isSimulationActive ? 'Simulation Active' : 'Simulation Stopped'}
                  </span>
                </div>
                {currentScenario && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">
                      Message {messageIndex} of {currentScenario.messages.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={stopSimulation}
              variant="outline"
              disabled={!isSimulationActive}
            >
              <Pause className="h-4 w-4 mr-2" />
              Stop
            </Button>
            <Button 
              onClick={resetSimulation}
              variant="outline"
              disabled={!currentScenario}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Testing Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-purple-600" />
            Communication Testing Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {testingScenarios.map((scenario) => (
              <Card key={scenario.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <h4 className="font-medium">{scenario.name}</h4>
                      <p className="text-sm text-gray-600">{scenario.description}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {scenario.messages.length} messages
                        </Badge>
                        <Badge variant="outline">
                          {scenario.duration}s intervals
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      onClick={() => startScenario(scenario)}
                      disabled={isSimulationActive}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Simulated Messages */}
      {simulatedMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-green-600" />
              Recent Simulated Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {simulatedMessages.slice(-5).map((message) => (
                <div 
                  key={message.id} 
                  className={`flex gap-3 p-3 rounded-lg ${
                    message.sender === "you" 
                      ? "bg-blue-50 ml-8" 
                      : "bg-gray-50 mr-8"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.sender === "you" 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-600 text-white"
                  }`}>
                    {message.sender === "you" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.sender === "you" ? "You" : "Testing Partner"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}