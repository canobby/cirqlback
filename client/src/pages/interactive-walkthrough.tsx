import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight, 
  Smartphone, 
  MapPin, 
  Users, 
  Store, 
  Award, 
  CheckCircle, 
  Play,
  Pause,
  RotateCcw
} from "lucide-react";

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  action: string;
  tip: string;
  screenshot?: string;
  interactive?: boolean;
  targetPage?: string;
}

const walkthroughData = {
  customer: {
    title: "Customer Experience Walkthrough",
    description: "Learn how to tap Cirql tags, explore the map, and earn rewards",
    icon: <Users className="h-6 w-6" />,
    duration: "5 minutes",
    steps: [
      {
        id: "step-1",
        title: "Find a Cirql Tag",
        description: "Look for the distinctive circular Cirql tag at participating businesses",
        action: "Locate the Cirql tag near the register, entrance, or menu display",
        tip: "Cirql tags are usually placed where customers naturally interact - register areas, entrance doors, or menu boards",
        interactive: true,
        targetPage: "/tap"
      },
      {
        id: "step-2", 
        title: "Tap with Your Phone",
        description: "Simply hold your smartphone near the tag to activate",
        action: "Hold your phone flat against the tag for 2-3 seconds",
        tip: "Make sure NFC is enabled in your phone settings. Remove thick cases if needed",
        interactive: true,
        targetPage: "/tap"
      },
      {
        id: "step-3",
        title: "Receive Your Reward",
        description: "Instantly get discounts, loyalty points, or special offers",
        action: "Your reward will appear automatically in your browser",
        tip: "Save the reward to your phone or email for easy access during purchase",
        interactive: false
      },
      {
        id: "step-4",
        title: "Explore the Map",
        description: "Discover nearby businesses and other customers",
        action: "Open the Map section to see all participating businesses",
        tip: "Use filters to find specific types of businesses - cafes, restaurants, retail, fitness",
        interactive: true,
        targetPage: "/map"
      },
      {
        id: "step-5",
        title: "Connect with Community",
        description: "Message other customers and businesses directly",
        action: "Toggle your visibility and start conversations",
        tip: "Control your privacy settings - only share what you're comfortable with",
        interactive: true,
        targetPage: "/map"
      }
    ]
  },
  business: {
    title: "Business Owner Walkthrough", 
    description: "Set up campaigns, manage your website, and track analytics",
    icon: <Store className="h-6 w-6" />,
    duration: "15 minutes",
    steps: [
      {
        id: "biz-step-1",
        title: "Create Your Account",
        description: "Choose Core ($14.99/mo) or Full ($29.99/mo) membership",
        action: "Sign up and complete your business profile",
        tip: "Full membership includes advanced marketing suite and priority support",
        interactive: true,
        targetPage: "/merchant"
      },
      {
        id: "biz-step-2",
        title: "Design Your First Campaign",
        description: "Create discount, loyalty, or special offer campaigns",
        action: "Set up campaign details, rewards, and target audience",
        tip: "Start with a simple 10% discount for new customers to test the system",
        interactive: true,
        targetPage: "/merchant"
      },
      {
        id: "biz-step-3",
        title: "Order Cirql Tags",
        description: "Get physical tags starting at $0.99 each",
        action: "Order tags and assign campaigns to specific locations",
        tip: "Place tags where customers naturally interact - register, entrance, menu boards",
        interactive: false
      },
      {
        id: "biz-step-4",
        title: "Build Your Website",
        description: "Create a professional website with the integrated builder",
        action: "Choose templates, customize design, add content and menu",
        tip: "Your website automatically syncs with your Cirql campaigns and business profile",
        interactive: true,
        targetPage: "/marketing"
      },
      {
        id: "biz-step-5",
        title: "Monitor Analytics",
        description: "Track taps, customer engagement, and revenue attribution",
        action: "Review real-time dashboard and optimize campaigns",
        tip: "Check analytics daily for the first week to understand customer patterns",
        interactive: true,
        targetPage: "/analytics"
      }
    ]
  },
  avatar: {
    title: "Avatar & Team Challenge Walkthrough",
    description: "Create your avatar and participate in team challenges",
    icon: <Award className="h-6 w-6" />,
    duration: "10 minutes", 
    steps: [
      {
        id: "avatar-step-1",
        title: "Create Your Avatar",
        description: "Design your unique digital representation",
        action: "Customize appearance, clothing, and accessories",
        tip: "Your avatar represents you on the map and in team challenges",
        interactive: true,
        targetPage: "/avatar"
      },
      {
        id: "avatar-step-2",
        title: "Join Team Challenges",
        description: "Find active challenges or create your own team",
        action: "Browse available challenges and join or form a team",
        tip: "Team challenges often have bigger rewards than individual taps",
        interactive: true,
        targetPage: "/community"
      },
      {
        id: "avatar-step-3",
        title: "Complete Challenge Objectives",
        description: "Visit required businesses and complete tasks",
        action: "Follow challenge requirements and track team progress",
        tip: "Coordinate with team members through in-app messaging for efficiency",
        interactive: true,
        targetPage: "/map"
      },
      {
        id: "avatar-step-4",
        title: "Claim Team Rewards",
        description: "Unlock exclusive prizes and badges",
        action: "Receive rewards when your team completes challenges",
        tip: "Some challenges unlock special avatar items or exclusive business offers",
        interactive: false
      }
    ]
  }
};

export default function InteractiveWalkthrough() {
  const [selectedWalkthrough, setSelectedWalkthrough] = useState<keyof typeof walkthroughData>('customer');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentWalkthrough = walkthroughData[selectedWalkthrough];
  const totalSteps = currentWalkthrough.steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetWalkthrough = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const autoPlaySteps = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);
    } else {
      setIsPlaying(false);
    }
  };

  const currentStepData = currentWalkthrough.steps[currentStep];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold gradient-text mb-4">Interactive Platform Walkthrough</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Step-by-step guided tours to master every feature of Cirqlback
        </p>
      </div>

      {/* Walkthrough Selection */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {Object.entries(walkthroughData).map(([key, walkthrough]) => (
          <Card 
            key={key}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedWalkthrough === key ? 'ring-2 ring-primary border-primary' : ''
            }`}
            onClick={() => {
              setSelectedWalkthrough(key as keyof typeof walkthroughData);
              setCurrentStep(0);
              setIsPlaying(false);
            }}
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className={`p-3 rounded-full ${
                  selectedWalkthrough === key ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                }`}>
                  {walkthrough.icon}
                </div>
              </div>
              <CardTitle className="text-lg">{walkthrough.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{walkthrough.description}</p>
              <Badge variant="outline" className="w-fit mx-auto">
                {walkthrough.duration}
              </Badge>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Main Walkthrough Interface */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                {currentWalkthrough.icon}
                {currentWalkthrough.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline" 
                size="sm"
                onClick={autoPlaySteps}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? 'Pause' : 'Auto Play'}
              </Button>
              <Button variant="outline" size="sm" onClick={resetWalkthrough}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Step Content */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold mb-2">{currentStepData.title}</h3>
                <p className="text-muted-foreground">{currentStepData.description}</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-semibold text-blue-900 mb-2">Action Required:</h4>
                <p className="text-blue-800 text-sm">{currentStepData.action}</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <h4 className="font-semibold text-green-900 mb-2">💡 Pro Tip:</h4>
                <p className="text-green-800 text-sm">{currentStepData.tip}</p>
              </div>

              {currentStepData.interactive && currentStepData.targetPage && (
                <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <h4 className="font-semibold text-yellow-900 mb-2">Try It Now:</h4>
                  <Link href={currentStepData.targetPage}>
                    <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                      <Smartphone className="mr-2 h-4 w-4" />
                      Open {currentStepData.targetPage.replace('/', '').replace('-', ' ')} Page
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Visual Preview */}
            <div className="bg-muted/30 rounded-lg p-6 text-center">
              <div className="aspect-video bg-white rounded-lg shadow-inner flex items-center justify-center mb-4">
                {currentStepData.interactive ? (
                  <div className="text-center space-y-2">
                    <Smartphone className="h-16 w-16 text-primary mx-auto" />
                    <p className="text-sm font-medium">Interactive Step</p>
                    <p className="text-xs text-muted-foreground">Try the action on the actual page</p>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                    <p className="text-sm font-medium">Information Step</p>
                    <p className="text-xs text-muted-foreground">Review the guidance</p>
                  </div>
                )}
              </div>
              <Badge variant="secondary">
                {currentStepData.interactive ? 'Interactive' : 'Informational'}
              </Badge>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-6 border-t">
            <Button 
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>

            <Button 
              onClick={nextStep}
              disabled={currentStep === totalSteps - 1}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Completion Message */}
          {currentStep === totalSteps - 1 && (
            <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-900 mb-2">Walkthrough Complete!</h3>
              <p className="text-green-800 mb-4">
                You've successfully completed the {currentWalkthrough.title.toLowerCase()}. 
                Ready to explore more features?
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={resetWalkthrough} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restart This Walkthrough
                </Button>
                <Link href="/user-guide">
                  <Button>
                    View Complete User Guide
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <section className="mt-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Quick Tips for Success</h2>
          <p className="text-muted-foreground">Essential tips to get the most out of Cirqlback</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <Smartphone className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Enable NFC</h3>
              <p className="text-sm text-muted-foreground">
                Make sure NFC is turned on in your phone settings for seamless tapping
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <MapPin className="h-8 w-8 text-secondary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Explore Nearby</h3>
              <p className="text-sm text-muted-foreground">
                Use the map to discover new businesses and connect with other customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 text-accent mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Join Teams</h3>
              <p className="text-sm text-muted-foreground">
                Team challenges offer bigger rewards and help build local community
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Award className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Track Progress</h3>
              <p className="text-sm text-muted-foreground">
                Monitor your rewards, badges, and challenge progress regularly
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Help & Support */}
      <section className="mt-12 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <h3 className="text-2xl font-bold mb-4">Need Additional Help?</h3>
            <p className="text-muted-foreground mb-6">
              Our comprehensive resources are here to support your Cirqlback journey
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/user-guide">
                <Button variant="outline">
                  Complete User Guide
                </Button>
              </Link>
              <Button variant="outline">
                Contact Support
              </Button>
              <Button variant="outline">
                Video Tutorials
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}