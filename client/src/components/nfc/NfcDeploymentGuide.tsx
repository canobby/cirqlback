import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Eye, 
  Users, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle, 
  Lightbulb,
  Download,
  ExternalLink
} from "lucide-react";

interface NfcDeploymentGuideProps {
  tagData?: {
    location: string;
    campaignType: string;
    businessType: string;
  };
}

export default function NfcDeploymentGuide({ tagData }: NfcDeploymentGuideProps) {
  const placementGuidelines = [
    {
      category: "High-Traffic Areas",
      icon: Users,
      color: "green",
      locations: [
        "Front entrance/exit doors",
        "Point-of-sale counter",
        "Waiting areas or queues",
        "Reception desk",
        "Main walkways"
      ],
      tips: "These areas get maximum customer visibility and natural interaction opportunities."
    },
    {
      category: "Eye-Level Placement",
      icon: Eye,
      color: "blue",
      locations: [
        "Counter-height surfaces",
        "Table tent displays", 
        "Wall-mounted signs",
        "Menu boards",
        "Product displays"
      ],
      tips: "Position tags at natural eye level (48-60 inches) for easy discovery."
    },
    {
      category: "Context-Relevant Spots",
      icon: MapPin,
      color: "purple",
      locations: [
        "Near promotional items",
        "With menu/product displays",
        "At loyalty program signs",
        "Next to special offers",
        "With digital displays"
      ],
      tips: "Place tags where they contextually make sense for the customer experience."
    }
  ];

  const deploymentSteps = [
    {
      step: 1,
      title: "Surface Preparation",
      description: "Clean the placement surface with alcohol wipe",
      icon: CheckCircle,
      color: "green"
    },
    {
      step: 2,
      title: "Tag Positioning",
      description: "Position tag for optimal visibility and accessibility",
      icon: MapPin,
      color: "blue"
    },
    {
      step: 3,
      title: "Secure Attachment",
      description: "Remove backing and firmly press for 10+ seconds",
      icon: Smartphone,
      color: "purple"
    },
    {
      step: 4,
      title: "Test Functionality",
      description: "Test tap with your phone to verify operation",
      icon: CheckCircle,
      color: "green"
    },
    {
      step: 5,
      title: "Add Signage",
      description: "Include clear call-to-action signage nearby",
      icon: Eye,
      color: "orange"
    }
  ];

  const troubleshootingTips = [
    {
      issue: "Low tap rates",
      solutions: ["Add clearer signage", "Reposition to higher traffic area", "Include visual instructions"],
      icon: AlertTriangle,
      color: "yellow"
    },
    {
      issue: "Tag not responding",
      solutions: ["Check for metal interference", "Verify tag isn't damaged", "Test with different phones"],
      icon: Smartphone,
      color: "red"
    },
    {
      issue: "Customer confusion",
      solutions: ["Add 'Tap here with phone' signs", "Include visual phone icon", "Train staff to assist"],
      icon: Users,
      color: "blue"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cirql Tag Deployment Guide</h2>
        <p className="text-gray-600">Best practices for maximum customer engagement and tap rates</p>
      </div>

      {/* Deployment Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            5-Step Deployment Process
          </CardTitle>
          <CardDescription>
            Follow these steps to ensure optimal tag placement and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {deploymentSteps.map((step) => (
              <div key={step.step} className="text-center space-y-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto
                  ${step.color === 'green' ? 'bg-green-100 text-green-600' :
                    step.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    step.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                    'bg-orange-100 text-orange-600'}`}>
                  <step.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-900">Step {step.step}</h4>
                  <h5 className="font-semibold text-gray-900 mb-1">{step.title}</h5>
                  <p className="text-xs text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Placement Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {placementGuidelines.map((guideline) => (
          <Card key={guideline.category}>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <guideline.icon className={`mr-2 h-5 w-5 
                  ${guideline.color === 'green' ? 'text-green-500' :
                    guideline.color === 'blue' ? 'text-blue-500' :
                    'text-purple-500'}`} />
                {guideline.category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {guideline.locations.map((location, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                    {location}
                  </li>
                ))}
              </ul>
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {guideline.tips}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
            Common Issues & Solutions
          </CardTitle>
          <CardDescription>
            Quick fixes for typical deployment challenges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {troubleshootingTips.map((tip, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center">
                  <tip.icon className={`mr-2 h-4 w-4 
                    ${tip.color === 'yellow' ? 'text-yellow-500' :
                      tip.color === 'red' ? 'text-red-500' :
                      'text-blue-500'}`} />
                  <h4 className="font-medium text-gray-900">{tip.issue}</h4>
                </div>
                <ul className="space-y-1">
                  {tip.solutions.map((solution, sIndex) => (
                    <li key={sIndex} className="text-sm text-gray-600 flex items-start">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mr-2 mt-2" />
                      {solution}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Optimization */}
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription>
          <strong>Pro Tips for Maximum Engagement:</strong> Add clear signage like "Tap here with your phone for rewards!", 
          ensure adequate lighting, keep tags at waist-to-eye level, and train staff to mention the tags to customers. 
          Monitor performance weekly and adjust placement based on tap analytics.
        </AlertDescription>
      </Alert>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" />
              Download Signage Templates
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1 h-4 w-4" />
              View Video Tutorial
            </Button>
            <Button variant="outline" size="sm">
              <Smartphone className="mr-1 h-4 w-4" />
              Test Your Tag
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}