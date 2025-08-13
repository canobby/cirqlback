import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  CreditCard,
  Users,
  Globe,
  Lock,
  Scale
} from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Terms of Service
          </h1>
          <div className="flex items-center justify-center gap-4 text-gray-600">
            <Badge>Last Updated: January 13, 2025</Badge>
            <Badge variant="outline">Effective Immediately</Badge>
          </div>
        </div>

        {/* Quick Summary */}
        <Card className="mb-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4">Terms Summary</h2>
            <p className="text-green-100 mb-6">
              These terms govern your use of Cirqlback's local marketing and gamification platform. 
              By using our services, you agree to these terms and our commitment to fair, transparent business practices.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-200" />
                <div className="font-semibold">Fair Use</div>
                <div className="text-sm text-green-200">Responsible platform usage</div>
              </div>
              <div className="text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-green-200" />
                <div className="font-semibold">Protection</div>
                <div className="text-sm text-green-200">Your rights safeguarded</div>
              </div>
              <div className="text-center">
                <Scale className="h-8 w-8 mx-auto mb-2 text-green-200" />
                <div className="font-semibold">Balance</div>
                <div className="text-sm text-green-200">Mutual benefits & obligations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acceptance of Terms */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              By accessing or using Cirqlback's platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. 
              If you do not agree with any part of these terms, you may not use our service.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-blue-900">What This Covers</h3>
              <ul className="space-y-1 text-blue-800 text-sm">
                <li>• Use of the Cirqlback platform and all features</li>
                <li>• Business and customer account creation and management</li>
                <li>• Quest system, AR games, and gamification features</li>
                <li>• Payment processing and subscription services</li>
                <li>• Data sharing and integration with third-party services</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* User Responsibilities */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              User Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 text-green-600">What You Can Do</h3>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    Use the platform for legitimate business purposes
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    Create engaging campaigns and quest content
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    Share your business information with customers
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    Integrate with compatible third-party services
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    Provide feedback and suggestions for improvement
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 text-red-600">What You Cannot Do</h3>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    Use the platform for illegal or harmful activities
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    Attempt to hack, reverse engineer, or compromise security
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    Share false, misleading, or deceptive information
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    Violate intellectual property rights
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    Spam, harass, or abuse other users
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Availability */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-600" />
              Service Availability & Modifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-purple-900">Service Uptime</h3>
              <p className="text-purple-800 text-sm">
                We strive to maintain 99.9% uptime for our platform. Scheduled maintenance will be announced 
                in advance, and we'll minimize any service disruptions.
              </p>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-amber-900">Feature Updates</h3>
              <p className="text-amber-800 text-sm">
                We continuously improve our platform by adding new features and enhancing existing ones. 
                Major changes will be communicated through email and in-app notifications.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Payment & Subscription Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Billing</h3>
                <ul className="space-y-1 text-gray-600 text-sm">
                  <li>• Monthly or annual subscription billing</li>
                  <li>• Automatic renewal unless cancelled</li>
                  <li>• Pro-rated charges for plan upgrades</li>
                  <li>• 30-day payment terms for enterprise accounts</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Refunds</h3>
                <ul className="space-y-1 text-gray-600 text-sm">
                  <li>• 14-day money-back guarantee for new subscriptions</li>
                  <li>• Pro-rated refunds for downgraded plans</li>
                  <li>• No refunds for partial month usage</li>
                  <li>• Enterprise refunds handled case-by-case</li>
                </ul>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-900">Payment Failure</div>
                  <div className="text-sm text-yellow-800">
                    If payment fails, your account may be suspended after a 7-day grace period. 
                    We'll send multiple reminders before any suspension occurs.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intellectual Property */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-600" />
              Intellectual Property
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Our Rights</h3>
              <p className="text-gray-600 text-sm mb-3">
                Cirqlback owns all rights to the platform, including software, designs, trademarks, and proprietary algorithms. 
                You may not copy, modify, or distribute our intellectual property without permission.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Your Rights</h3>
              <p className="text-gray-600 text-sm mb-3">
                You retain ownership of your business content, customer data, and any materials you upload to the platform. 
                You grant us a license to use this content solely to provide our services.
              </p>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-indigo-900">Content Guidelines</h3>
              <ul className="space-y-1 text-indigo-800 text-sm">
                <li>• Ensure you have rights to all uploaded content</li>
                <li>• Respect copyright and trademark laws</li>
                <li>• Don't upload inappropriate or offensive material</li>
                <li>• Report any suspected IP violations</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Limitation of Liability */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Limitation of Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold mb-2 text-red-900">Important Notice</h3>
              <p className="text-red-800 text-sm">
                While we strive to provide excellent service, Cirqlback's liability is limited to the amount 
                you've paid for our services in the 12 months preceding any claim. We are not liable for 
                indirect, incidental, or consequential damages.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium mb-2">We Provide</h4>
                <ul className="space-y-1">
                  <li>• Best-effort service delivery</li>
                  <li>• Regular platform updates and improvements</li>
                  <li>• Customer support during business hours</li>
                  <li>• Security measures and data protection</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">We Cannot Guarantee</h4>
                <ul className="space-y-1">
                  <li>• 100% uptime or error-free operation</li>
                  <li>• Specific business results or revenue</li>
                  <li>• Compatibility with all third-party services</li>
                  <li>• Uninterrupted access during maintenance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Changes */}
        <Card>
          <CardHeader>
            <CardTitle>Contact & Terms Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Questions About Terms</h3>
                <p className="text-gray-600 mb-3 text-sm">
                  If you have questions about these terms or need clarification on any point, please contact us:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>Email: legal@cirqlback.com</li>
                  <li>Phone: +1 (555) 123-4567</li>
                  <li>Address: 123 Innovation Way, San Francisco, CA 94107</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Terms Updates</h3>
                <p className="text-gray-600 mb-3 text-sm">
                  We may update these terms periodically. Significant changes will be announced with 30 days notice.
                </p>
                <Button variant="outline" className="w-full">
                  Subscribe to Legal Updates
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}