import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VoiceTranslator } from '@/components/communication/voice-translator';
import { LanguageSelector } from '@/components/ui/language-selector';
import { TranslatedText, useLanguage } from '@/lib/translation';
import { 
  MessageCircle, 
  Heart, 
  Users, 
  Globe, 
  Mic, 
  Type, 
  Store, 
  Coffee,
  UtensilsCrossed,
  ShoppingBag,
  Star,
  MapPin
} from 'lucide-react';

export default function CommunicationPage() {
  const [activeDemo, setActiveDemo] = useState<string>('restaurant');
  const { currentLanguage } = useLanguage();

  const demoScenarios = {
    restaurant: {
      icon: UtensilsCrossed,
      title: 'Restaurant Order',
      customer: "Hi! I'd like to order the special pasta dish, but I'm allergic to nuts. Is that possible?",
      merchant: "Of course! Our pasta special can be made without nuts. Would you like extra cheese instead?",
      setting: 'Maria\'s Italian Bistro'
    },
    coffee: {
      icon: Coffee,
      title: 'Coffee Shop',
      customer: "Good morning! What's your most popular drink? I need something with lots of energy!",
      merchant: "Good morning! Our signature espresso blend is very popular. It's strong and will definitely give you energy!",
      setting: 'Corner Coffee House'
    },
    retail: {
      icon: ShoppingBag,
      title: 'Retail Shopping',
      customer: "I'm looking for a gift for my mother. She loves flowers and bright colors.",
      merchant: "Perfect! I have some beautiful scarves with floral patterns. Here, let me show you these.",
      setting: 'Local Boutique'
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Heart className="h-8 w-8 text-red-500" />
          <h1 className="text-4xl font-bold gradient-text">Communication & Translation</h1>
          <Globe className="h-8 w-8 text-blue-500" />
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          <TranslatedText>
            Break down language barriers and build stronger relationships between customers and merchants with AI-powered real-time translation
          </TranslatedText>
        </p>
        
        {/* Language Selector */}
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-muted-foreground">Platform Language:</span>
          <LanguageSelector variant="select" showFlag={true} />
        </div>
      </div>

      <Tabs defaultValue="translator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="translator" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <TranslatedText>Live Translator</TranslatedText>
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <TranslatedText>Demo Scenarios</TranslatedText>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <TranslatedText>Features</TranslatedText>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="translator" className="space-y-6">
          <VoiceTranslator mode="customer" />
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <TranslatedText>For Customers</TranslatedText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <TranslatedText>Order food in any language</TranslatedText>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <TranslatedText>Ask questions about products</TranslatedText>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <TranslatedText>Get local recommendations</TranslatedText>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <TranslatedText>Build relationships with merchants</TranslatedText>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-green-500" />
                  <TranslatedText>For Merchants</TranslatedText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <TranslatedText>Serve international customers</TranslatedText>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <TranslatedText>Explain menu items clearly</TranslatedText>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <TranslatedText>Provide better customer service</TranslatedText>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <TranslatedText>Expand customer base globally</TranslatedText>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demo" className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">
              <TranslatedText>Real-World Translation Scenarios</TranslatedText>
            </h3>
            <p className="text-muted-foreground mb-6">
              <TranslatedText>See how our translation system works in common business situations</TranslatedText>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {Object.entries(demoScenarios).map(([key, scenario]) => {
              const Icon = scenario.icon;
              return (
                <Button
                  key={key}
                  variant={activeDemo === key ? "default" : "outline"}
                  onClick={() => setActiveDemo(key)}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium">{scenario.title}</span>
                </Button>
              );
            })}
          </div>

          {activeDemo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {demoScenarios[activeDemo as keyof typeof demoScenarios].setting}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Badge className="mb-2">Customer (English)</Badge>
                    <p className="text-sm mb-3">{demoScenarios[activeDemo as keyof typeof demoScenarios].customer}</p>
                    <div className="border-t pt-3">
                      <Badge variant="secondary" className="mb-2">
                        <TranslatedText>{`Translated to ${currentLanguage.toUpperCase()}`}</TranslatedText>
                      </Badge>
                      <p className="text-sm font-medium">
                        <TranslatedText>
                          {demoScenarios[activeDemo as keyof typeof demoScenarios].customer}
                        </TranslatedText>
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <Badge className="mb-2">Merchant (English)</Badge>
                    <p className="text-sm mb-3">{demoScenarios[activeDemo as keyof typeof demoScenarios].merchant}</p>
                    <div className="border-t pt-3">
                      <Badge variant="secondary" className="mb-2">
                        <TranslatedText>{`Translated to ${currentLanguage.toUpperCase()}`}</TranslatedText>
                      </Badge>
                      <p className="text-sm font-medium">
                        <TranslatedText>
                          {demoScenarios[activeDemo as keyof typeof demoScenarios].merchant}
                        </TranslatedText>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-red-500" />
                  <TranslatedText>Voice Translation</TranslatedText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <TranslatedText>
                    Speak naturally and get instant voice translations with AI-powered speech recognition and synthesis
                  </TranslatedText>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-blue-500" />
                  <TranslatedText>Text Translation</TranslatedText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <TranslatedText>
                    Automatically translate all platform content and user messages in real-time
                  </TranslatedText>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-500" />
                  <TranslatedText>12 Languages</TranslatedText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <TranslatedText>
                    Support for English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic, Hindi, and Russian
                  </TranslatedText>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <TranslatedText>Relationship Building</TranslatedText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <TranslatedText>
                    Foster deeper connections between customers and merchants by removing language barriers
                  </TranslatedText>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-purple-500" />
                  <TranslatedText>Conversation History</TranslatedText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <TranslatedText>
                    Keep track of conversations with translation history and playback features
                  </TranslatedText>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  <TranslatedText>Cultural Context</TranslatedText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <TranslatedText>
                    AI understands local business context and cultural nuances for more accurate translations
                  </TranslatedText>
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}