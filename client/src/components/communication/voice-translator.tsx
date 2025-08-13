import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, Languages, MessageCircle, Heart } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/translation';
import { useToast } from '@/hooks/use-toast';

interface VoiceTranslatorProps {
  mode?: 'customer' | 'merchant';
  onTranslationComplete?: (originalText: string, translatedText: string) => void;
}

export function VoiceTranslator({ mode = 'customer', onTranslationComplete }: VoiceTranslatorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [translations, setTranslations] = useState<Array<{
    id: string;
    originalText: string;
    translatedText: string;
    timestamp: Date;
    direction: 'customer' | 'merchant';
  }>>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('es');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { currentLanguage, translateVoice } = useLanguage();
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = handleRecordingStop;
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Recording Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleRecordingStop = async () => {
    setIsProcessing(true);
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const result = await translateVoice(audioBlob, selectedLanguage);
      
      const newTranslation = {
        id: Date.now().toString(),
        originalText: result.originalText,
        translatedText: result.translatedText,
        timestamp: new Date(),
        direction: mode,
      };

      setTranslations(prev => [newTranslation, ...prev]);
      onTranslationComplete?.(result.originalText, result.translatedText);

      toast({
        title: 'Translation Complete',
        description: 'Voice successfully translated!',
      });

      // Play translated audio if available
      if (result.audioUrl) {
        const audio = new Audio(result.audioUrl);
        audio.play().catch(console.error);
      }
    } catch (error) {
      console.error('Translation failed:', error);
      toast({
        title: 'Translation Failed',
        description: 'Could not translate voice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const playTranslation = async (text: string, language: SupportedLanguage) => {
    try {
      const response = await fetch('/api/translate/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
      }
    } catch (error) {
      console.error('Text-to-speech failed:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          Live Voice Translator
          <Heart className="h-4 w-4 text-red-500" />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Build stronger relationships through real-time translation
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Translate to:</label>
          <Select value={selectedLanguage} onValueChange={(value: SupportedLanguage) => setSelectedLanguage(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                <SelectItem key={code} value={code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            size="lg"
            className={`${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-primary hover:bg-primary/90'
            } transition-all duration-200`}
          >
            {isRecording ? (
              <>
                <MicOff className="mr-2 h-5 w-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                Start Recording
              </>
            )}
          </Button>
          
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
              Translating...
            </div>
          )}
        </div>

        {/* Translation History */}
        {translations.length > 0 && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversation History
            </h3>
            {translations.map((translation) => (
              <div
                key={translation.id}
                className={`p-4 rounded-lg border ${
                  translation.direction === 'customer' 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={translation.direction === 'customer' ? 'default' : 'secondary'}>
                    {translation.direction === 'customer' ? 'Customer' : 'Merchant'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {translation.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Original:</span>
                    <p className="mt-1 text-gray-700">{translation.originalText}</p>
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium flex items-center gap-2">
                      Translation:
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => playTranslation(translation.translatedText, selectedLanguage)}
                        className="h-6 w-6 p-0"
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    </span>
                    <p className="mt-1 text-gray-700 font-medium">{translation.translatedText}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Helpful Tips */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
          <h4 className="text-sm font-medium text-purple-900 mb-2">💡 Tips for Better Translations:</h4>
          <ul className="text-xs text-purple-700 space-y-1">
            <li>• Speak clearly and at a normal pace</li>
            <li>• Use simple, direct sentences</li>
            <li>• Pause between different topics</li>
            <li>• Keep recordings under 30 seconds for best results</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}