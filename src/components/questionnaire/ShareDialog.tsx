import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionnaireId: string;
}

export const ShareDialog = ({ open, onOpenChange, questionnaireId }: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);
  
  // This generates a real, working URL based on the current domain.
  // Works for localhost and your deployed Vercel URL.
  const shareUrl = `${window.location.origin}/form/${questionnaireId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share questionnaire</DialogTitle>
          <DialogDescription>
            Anyone with this public link can access and complete the form.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
            <Label htmlFor="share-link">Shareable Link</Label>
            <div className="flex items-center gap-2">
              <Input id="share-link" value={shareUrl} readOnly className="font-mono text-sm" />
              <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};