import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { 
  ArrowLeft,
  Users,
  Target,
  Zap,
  Heart,
  Globe,
  Smartphone,
  TrendingUp,
  Award
} from "lucide-react";
import cirqlLogoPath from "@assets/cirqlback-logo-transparent.png";

export default function AboutPage() {
  const [, setLocation] = useLocation();

  const values = [
    {
      icon: <Heart className="h-8 w-8 text-pink-500" />,
      title: "Community First",
      description: "We believe in strengthening local communities by connecting neighbors with businesses that care."
    },
    {
      icon: <Target className="h-8 w-8 text-blue-500" />,
      title: "Authentic Experiences",
      description: "Every interaction is genuine, every reward is earned, and every discovery is meaningful."
    },
    {
      icon: <Zap className="h-8 w-8 text-orange-500" />,
      title: "Innovation with Purpose",
      description: "We harness cutting-edge technology to solve real problems for real people and businesses."
    }
  ];

  const stats = [
    { number: "500+", label: "Local Businesses", icon: <Users className="h-6 w-6" /> },
    { number: "10K+", label: "Happy Customers", icon: <Smartphone className="h-6 w-6" /> },
    { number: "25%", label: "Average Revenue Increase", icon: <TrendingUp className="h-6 w-6" /> },
    { number: "98%", label: "Customer Satisfaction", icon: <Award className="h-6 w-6" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div
            onClick={() => setLocation('/')}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              marginBottom: '24px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.2)'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </div>
          
          <div className="text-center">
            <img src={cirqlLogoPath} alt="Cirqlback" className="h-20 mx-auto mb-6" />
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              About Cirqlback
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              We're revolutionizing how communities discover, engage with, and support local businesses 
              through innovative NFC technology and gamified experiences.
            </p>
          </div>
        </div>
      </div>

      {/* Mission Statement */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">Our Mission</h2>
          <p className="text-xl text-gray-600 leading-relaxed mb-12">
            To create an addictive local discovery platform that transforms every business visit into an exciting adventure. 
            We're building the future where customers eagerly explore their neighborhoods, businesses thrive through genuine 
            engagement, and communities grow stronger through meaningful connections.
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto"></div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              These core principles guide everything we do at Cirqlback.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    {value.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Growing Together</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See how we're making a real impact in communities across the country.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Story</h2>
          </div>

          <div className="prose prose-lg mx-auto text-gray-600">
            <p className="text-xl leading-relaxed mb-8">
              Cirqlback was born from a simple observation: local businesses are the heart of our communities, 
              but they often struggle to compete with big chains and online giants. Meanwhile, customers want 
              authentic experiences and meaningful connections, but finding great local spots can be hit-or-miss.
            </p>
            
            <p className="text-xl leading-relaxed mb-8">
              We realized that by combining the excitement of gaming with the simplicity of modern technology, 
              we could create something entirely new - a platform that makes local discovery genuinely addictive 
              while driving real results for businesses.
            </p>

            <p className="text-xl leading-relaxed">
              Today, Cirqlback is more than just an app - it's a movement. Every tap brings customers closer to 
              their community, every reward strengthens the local economy, and every business that joins us 
              helps create a more vibrant neighborhood for everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Join the Movement?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Whether you're a customer looking for adventure or a business ready to grow, 
            Cirqlback has something amazing for you.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div
              onClick={() => setLocation('/customer-bento')}
              style={{
                backgroundColor: 'white',
                color: '#7c3aed',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'white'}
            >
              Start Exploring
            </div>
            <div
              onClick={() => setLocation('/merchant-bento')}
              style={{
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
            >
              Grow Your Business
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}