import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Eye, 
  Lock, 
  Database, 
  Users, 
  Globe,
  Download,
  Trash2,
  FileText,
  AlertTriangle
} from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <div className="flex items-center justify-center gap-4 text-gray-600">
            <Badge>Last Updated: January 13, 2025</Badge>
            <Badge variant="outline">Effective Immediately</Badge>
          </div>
        </div>

        {/* Privacy Overview */}
        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4">Your Privacy Matters</h2>
            <p className="text-blue-100 mb-6">
              At Cirqlback, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This policy explains how we collect, use, and safeguard your data.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <Eye className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <div className="font-semibold">Transparency</div>
                <div className="text-sm text-blue-200">Clear data practices</div>
              </div>
              <div className="text-center">
                <Lock className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <div className="font-semibold">Security</div>
                <div className="text-sm text-blue-200">Protected information</div>
              </div>
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <div className="font-semibold">Control</div>
                <div className="text-sm text-blue-200">Your data, your choice</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Personal Information</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Name, email address, and contact information</li>
                <li>• Business information (name, address, industry)</li>
                <li>• Profile photos and business images</li>
                <li>• Payment and billing information</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Usage Information</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Platform interaction data and preferences</li>
                <li>• Quest participation and gaming activity</li>
                <li>• Location data (with permission) for local features</li>
                <li>• Device information and browser details</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Business Analytics</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Customer engagement metrics</li>
                <li>• Campaign performance data</li>
                <li>• Anonymous usage statistics</li>
                <li>• Integration data from connected services</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Service Delivery</h3>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li>• Provide platform features and functionality</li>
                  <li>• Process payments and manage subscriptions</li>
                  <li>• Deliver customer support and assistance</li>
                  <li>• Send important service updates</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Platform Improvement</h3>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li>• Analyze usage patterns and preferences</li>
                  <li>• Develop new features and enhancements</li>
                  <li>• Optimize performance and user experience</li>
                  <li>• Conduct research and development</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Protection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              Data Protection & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Security Measures</h3>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• End-to-end encryption for sensitive data</li>
                <li>• Regular security audits and monitoring</li>
                <li>• Secure cloud infrastructure with enterprise-grade protection</li>
                <li>• Multi-factor authentication for account access</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Data Storage</h3>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• Data stored in secure, compliant data centers</li>
                <li>• Regular backups and disaster recovery procedures</li>
                <li>• Geographic data residency options available</li>
                <li>• Automatic data retention policy enforcement</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              Your Rights & Choices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Access Your Data</div>
                    <div className="text-sm text-gray-600">View and download your information</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">Update Information</div>
                    <div className="text-sm text-gray-600">Correct or modify your data</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Download className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="font-medium">Data Portability</div>
                    <div className="text-sm text-gray-600">Export your data in standard formats</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium">Delete Account</div>
                    <div className="text-sm text-gray-600">Remove your information permanently</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">Exercise Your Rights</div>
                  <div className="text-sm text-blue-800">
                    Contact us at privacy@cirqlback.com to request access, updates, or deletion of your personal data. 
                    We'll respond within 30 days.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Contact Us About Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Privacy Questions</h3>
                <p className="text-gray-600 mb-3">
                  If you have questions about this privacy policy or our data practices, please contact us:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>Email: privacy@cirqlback.com</li>
                  <li>Phone: +1 (555) 123-4567</li>
                  <li>Address: 123 Innovation Way, San Francisco, CA 94107</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Download Your Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Update Privacy Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Contact Privacy Team
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policy Updates */}
        <Card>
          <CardContent className="p-6 bg-gray-50">
            <h3 className="font-semibold mb-3">Policy Updates</h3>
            <p className="text-gray-600 text-sm">
              We may update this privacy policy from time to time. When we make significant changes, 
              we'll notify you by email and display a notice on our platform. Continued use of our 
              services after changes take effect constitutes acceptance of the updated policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}