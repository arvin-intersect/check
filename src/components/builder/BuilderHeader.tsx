import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Save, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const BuilderHeader = () => {
  return (
    <header className="border-b border-border bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Enterprise AI Readiness Assessment
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">Draft</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Saved 2 minutes ago
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button variant="default">Publish</Button>
        </div>
      </div>
    </header>
  );
};
