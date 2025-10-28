// src/components/workshop/RapidReviewCard.tsx

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Bot, User, ChevronDown, ChevronUp, Edit, Copy, RotateCcw, Quote, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkshopBoard, Insight } from '@/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RapidReviewCardProps {
  insight: Insight;
  isSelected: boolean;
  isFocused: boolean;
  isInCart: boolean;
  boards: WorkshopBoard[];
  onSelectionChange: (id: string, checked: boolean) => void;
  onUpdate: (id: string, updates: Partial<Insight>) => void;
  onAddToCart: (id: string) => void;
  onGenerateSummary: (id: string) => void;
  isGenerating: boolean;
}

export const RapidReviewCard = ({ insight, isSelected, isFocused, isInCart, boards, onSelectionChange, onUpdate, onAddToCart, onGenerateSummary, isGenerating }: RapidReviewCardProps) => {
  const [isAnswerExpanded, setIsAnswerExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedHeading, setEditedHeading] = useState(insight.aiHeading);
  const [editedSummary, setEditedSummary] = useState(insight.aiSummary);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isFocused]);

  const wordCount = (editedHeading?.length || 0) + (editedSummary?.length || 0);
  const isOverLimit = wordCount > 200; // Manager requested 40 words, let's use 200 chars as a proxy

  const handleSave = () => {
    onUpdate(insight.id, { aiHeading: editedHeading, aiSummary: editedSummary });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedHeading(insight.aiHeading);
    setEditedSummary(insight.aiSummary);
    setIsEditing(false);
  };
  
  const handleBoardChange = (boardId: string) => {
    onUpdate(insight.id, { boardCategory: boardId });
  }

  const renderAiSummary = () => {
    if (!insight.aiSummary && !isGenerating) {
        return (
            <div className="flex items-center justify-center h-full">
                <Button variant="secondary" onClick={() => onGenerateSummary(insight.id)}>
                    <Sparkles className="mr-2 h-4 w-4" /> Generate AI Summary
                </Button>
            </div>
        )
    }

    if (isGenerating) {
        return (
            <div className="flex items-center justify-center h-full text-accent-foreground/80">
                <Sparkles className="mr-2 h-4 w-4 animate-spin" /> Generating...
            </div>
        )
    }

    if (isEditing) {
      return (
        <div className="space-y-2">
            <Textarea 
                placeholder="AI Generated Heading..."
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-base font-semibold resize-none bg-background/80 text-foreground border-accent/50 focus-visible:ring-accent"
            />
            <Textarea 
                placeholder="AI Generated Summary..."
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="text-sm min-h-[100px] resize-y bg-background/80 text-foreground border-accent/50 focus-visible:ring-accent"
            />
            <div className="flex justify-between items-center pt-2">
                <span className={cn("text-xs font-mono", isOverLimit ? "text-destructive-foreground font-bold" : "text-accent-foreground/70")}>
                    {wordCount} / 200 chars
                </span>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel} className="text-accent-foreground/80 hover:bg-white/20 hover:text-white">Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={isOverLimit} className="bg-white text-accent hover:bg-white/90">Save</Button>
                </div>
            </div>
        </div>
      );
    }
    
    return (
        <>
            <h4 className="font-semibold text-accent-foreground pr-16">{insight.aiHeading}</h4>
            <p className="text-sm text-accent-foreground/90">{insight.aiSummary}</p>
            <div className="flex items-center justify-between mt-3 -mx-2">
                <div className="flex items-center">
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:bg-accent/20 hover:text-accent-foreground" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Edit</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:bg-accent/20 hover:text-accent-foreground" onClick={() => navigator.clipboard.writeText(`${insight.aiHeading}\n${insight.aiSummary}`)}><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Copy</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:bg-accent/20 hover:text-accent-foreground" onClick={() => onGenerateSummary(insight.id)}><RotateCcw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Regenerate</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:bg-accent/20 hover:text-accent-foreground"><Quote className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Cite Answer</p></TooltipContent></Tooltip>
                </div>
                <Select defaultValue="neutral">
                    <SelectTrigger className="h-7 w-[120px] text-xs bg-transparent border-white/20 text-white hover:bg-white/20 focus:ring-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="neutral" className="text-xs">Neutral Tone</SelectItem>
                        <SelectItem value="executive" className="text-xs">Executive Tone</SelectItem>
                        <SelectItem value="technical" className="text-xs">Technical Tone</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </>
    );
  }

  return (
    <Card ref={cardRef} className={cn(
        "transition-all relative border-2", 
        isSelected && "bg-blue-50 border-blue-400",
        isFocused && "ring-2 ring-primary ring-offset-2",
        isInCart && "border-green-400 bg-green-50/50"
    )}>
      <div className="flex gap-4 p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(insight.id, !!checked)}
          className="mt-1"
        />
        <div className="flex-1 space-y-4">
            <div className="space-y-2">
                <div className="flex justify-between items-start">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{insight.sectionTitle}</p>
                </div>
                <h3 className="font-semibold text-foreground leading-snug">{insight.questionPrompt}</h3>
                <div className="prose prose-sm max-w-none text-muted-foreground pt-2">
                    <p className={cn("transition-all", !isAnswerExpanded && "line-clamp-3")}>{insight.answer}</p>
                </div>
                <Button variant="link" size="sm" onClick={() => setIsAnswerExpanded(!isAnswerExpanded)} className="h-auto p-0 text-xs">
                    {isAnswerExpanded ? <ChevronUp className="h-3 w-3 mr-1"/> : <ChevronDown className="h-3 w-3 mr-1"/>}
                    {isAnswerExpanded ? 'Show Less' : 'Show More'}
                </Button>
            </div>
            
            <Separator />
            
            <div className="p-4 rounded-lg bg-gradient-to-br from-[hsl(var(--accent))] to-teal-600 text-white shadow-lg border-2 border-accent/30 relative">
                <div className="absolute top-2 right-2 flex items-center gap-2 text-white/80 text-xs">
                    <Sparkles className="h-4 w-4 animate-pulse" /> AI Summary
                </div>
                <div className="space-y-2 min-h-[100px] flex flex-col justify-center">
                   {renderAiSummary()}
                </div>
            </div>

            <div className="flex items-center justify-between pt-2">
                <div className="w-64">
                    <Select value={insight.boardCategory} onValueChange={handleBoardChange}>
                        <SelectTrigger className="h-9 bg-muted/50">
                            <SelectValue placeholder="Assign to board..." />
                        </SelectTrigger>
                        <SelectContent>
                            {boards.map(board => (
                                <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => onAddToCart(insight.id)} disabled={isInCart} className={cn("w-40", isInCart && "bg-green-600 hover:bg-green-700")}>
                    {isInCart ? <><CheckCircle className="mr-2 h-4 w-4"/> Added to Cart</> : 'Add to Workshop'}
                </Button>
            </div>
        </div>
      </div>
    </Card>
  );
};