import { useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Smartphone,
  CheckCircle,
  AlertTriangle,
  Info,
  NfcIcon,
  Zap,
  Copy,
  Clock,
} from "lucide-react";

interface NFCWriterProps {
  tagData: {
    url: string;
    campaignId?: string;
    businessName?: string;
    campaignType?: string;
  };
  onWriteComplete?: (success: boolean) => void;
}

declare global {
  interface Window {
    NDEFReader?: any;
  }
}

type Platform = "android" | "ios" | "other";

function detectPlatform(): Platform {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

/**
 * Programs a physical NFC tag with a Cirql /tap/<id> URL.
 *
 * Honest platform behaviour (no simulation):
 *  - Android Chrome/Edge expose the Web NFC API (`NDEFReader`) and can write in
 *    the browser. We write a single URL record — that is what makes BOTH iOS and
 *    Android open the tap page automatically when a customer later taps it.
 *  - iPhone Safari cannot write NFC tags from the browser by any means (Apple
 *    restricts Core NFC to native apps). We do NOT fake success; instead we show
 *    the exact URL and how to write it with a free app (e.g. NFC Tools).
 *  - Desktop/other: nothing to write against — surface the URL to copy.
 */
export default function UniversalNFCWriter({ tagData, onWriteComplete }: NFCWriterProps) {
  const platform = useMemo(detectPlatform, []);
  // The real capability signal is the API's presence, not the OS guess.
  const canWriteInBrowser = typeof window !== "undefined" && "NDEFReader" in window;

  const [isWriting, setIsWriting] = useState(false);
  const [writeStatus, setWriteStatus] = useState<"idle" | "writing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(tagData.url);
      setCopied(true);
      toast({ title: "Link copied", description: "Paste it into your tag-writing app." });
    } catch {
      toast({ title: "Couldn't copy", description: tagData.url, variant: "destructive" });
    }
  };

  const writeAndroid = async () => {
    setIsWriting(true);
    setWriteStatus("writing");
    setErrorMessage("");
    try {
      const ndef = new window.NDEFReader();
      // A single URL record: the phone OS opens it on tap (iOS + Android alike).
      await ndef.write({ records: [{ recordType: "url", data: tagData.url }] });
      setWriteStatus("success");
      onWriteComplete?.(true);
      toast({
        title: "NFC tag written",
        description: "Tap it with a phone to test — it should open the reward page.",
      });
    } catch (error: any) {
      setWriteStatus("error");
      // AbortError = the write window timed out before a tag was presented.
      const msg =
        error?.name === "NotAllowedError"
          ? "NFC permission was denied. Allow NFC for this site and try again."
          : error?.name === "AbortError"
          ? "No tag detected. Tap the button and hold a blank tag to the top of your phone."
          : error?.message || "Failed to write the tag.";
      setErrorMessage(msg);
      onWriteComplete?.(false);
      toast({ title: "NFC write failed", description: msg, variant: "destructive" });
    } finally {
      setIsWriting(false);
    }
  };

  const urlBox = (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground mb-1">Tag URL</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-sm break-all">{tagData.url}</code>
        <Button size="sm" variant="outline" onClick={copyUrl} className="shrink-0">
          <Copy className="h-3.5 w-3.5 mr-1" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NfcIcon className="h-6 w-6" />
          Write NFC Tag
          <Badge
            variant={canWriteInBrowser ? "default" : "secondary"}
            className={canWriteInBrowser ? "bg-green-100 text-green-700" : ""}
          >
            {canWriteInBrowser ? "Can write here" : platform === "ios" ? "iPhone: use an app" : "Not on this device"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Campaign context */}
        {(tagData.businessName || tagData.campaignType) && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {tagData.businessName && (
                <>
                  <strong>Business:</strong> {tagData.businessName}
                  <br />
                </>
              )}
              {tagData.campaignType && (
                <>
                  <strong>Campaign:</strong> {tagData.campaignType}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {urlBox}

        {/* ── Android (or any browser exposing Web NFC): real in-browser write ── */}
        {canWriteInBrowser && (
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm space-y-1">
              <p className="font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" /> How to write
              </p>
              <p>1. Enable NFC in your phone settings.</p>
              <p>2. Tap “Write to NFC tag”, then hold a blank tag to the top of your phone.</p>
              <p>3. Keep it steady until you see the success message.</p>
            </div>

            {writeStatus === "writing" && (
              <Alert>
                <Clock className="h-4 w-4 animate-spin" />
                <AlertDescription>Hold the tag to your phone…</AlertDescription>
              </Alert>
            )}
            {writeStatus === "success" && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Tag written. Tap it with any phone to confirm it opens the reward page.
                </AlertDescription>
              </Alert>
            )}
            {writeStatus === "error" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Button onClick={writeAndroid} disabled={isWriting} className="w-full h-14 text-lg" size="lg">
              {isWriting ? (
                <>
                  <Clock className="h-5 w-5 mr-3 animate-spin" /> Writing to tag…
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-3" /> Write to NFC tag
                </>
              )}
            </Button>
          </div>
        )}

        {/* ── iPhone: browser can't write; guide the native-app path ── */}
        {!canWriteInBrowser && platform === "ios" && (
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                iPhone can’t program NFC tags from the browser (Apple limits this to native
                apps). Your customers’ iPhones can still <strong>read</strong> the tag — you
                just need to write it once with a free app.
              </AlertDescription>
            </Alert>
            <div className="p-4 bg-muted/40 rounded-lg text-sm space-y-1">
              <p className="font-medium">Write it with NFC Tools (free):</p>
              <p>1. Install “NFC Tools” from the App Store.</p>
              <p>2. Open it → <strong>Write</strong> → <strong>Add a record</strong> → <strong>URL/URI</strong>.</p>
              <p>3. Paste the copied Tag URL above, then tap <strong>OK</strong> → <strong>Write</strong>.</p>
              <p>4. Hold a blank tag to the top of your iPhone until it confirms.</p>
            </div>
          </div>
        )}

        {/* ── Desktop / unsupported: hand off the URL ── */}
        {!canWriteInBrowser && platform === "other" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              To program a tag, open this page on an <strong>Android phone with Chrome</strong>,
              or copy the Tag URL above and write it with a tag-writing app on your phone.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
