// src/components/workshop/RapidReviewCard.tsx

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Bot, User, ChevronDown, ChevronUp, Edit, Copy, RotateCcw, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkshopBoard } from '@/types';

// This would be your real Insight type from the API
interface MockInsight {
    id: string;
    questionPrompt: string;
    answer: string;
    sectionTitle: string;
    aiHeading: string;
    aiSummary: string;
    boardCategory?: string;
}

interface RapidReviewCardProps {
  insight: MockInsight;
  isSelected: boolean;
  isFocused: boolean;
  isInCart: boolean;
  boards: WorkshopBoard[];
  onSelectionChange: (id: string, checked: boolean) => void;
  onUpdate: (id: string, updates: Partial<MockInsight>) => void;
  onAddToCart: (id: string) => void;
}

export const RapidReviewCard = ({ insight, isSelected, isFocused, isInCart, boards, onSelectionChange, onUpdate, onAddToCart }: RapidReviewCardProps) => {
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
  const isOverLimit = wordCount > 200; // Manager requested 40 words, but that's roughly 200 chars. Adjust as needed.

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
    if (isEditing) {
      return (
        <div className="space-y-2">
            <Textarea 
                placeholder="AI Generated Heading"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-base font-semibold resize-none bg-white"
            />
            <Textarea 
                placeholder="AI Generated Summary"
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="text-sm min-h-[100px] resize-y bg-white"
            />
            <div className="flex justify-between items-center pt-2">
                <span className={cn("text-xs font-mono", isOverLimit ? "text-destructive" : "text-muted-foreground")}>
                    {wordCount} / 200 chars
                </span>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={isOverLimit}>Save</Button>
                </div>
            </div>
        </div>
      );
    }
    
    return (
        <>
            <h4 className="font-semibold text-accent-foreground">{insight.aiHeading}</h4>
            <p className="text-sm text-accent-foreground/90">{insight.aiSummary}</p>
            <div className="flex items-center justify-between mt-3 -mx-2">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:bg-accent/20 hover:text-accent-foreground" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:bg-accent/20 hover:text-accent-foreground"><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:bg-accent/20 hover:text-accent-foreground"><RotateCcw className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-accent-foreground/70 hover:bg-accent/20 hover:text-accent-foreground"><Quote className="h-4 w-4" /></Button>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                    {wordCount} chars
                </Badge>
            </div>
        </>
    );
  }

  return (
    <Card ref={cardRef} className={cn(
        "transition-all relative", 
        isSelected && "bg-blue-50 border-blue-300",
        isFocused && "ring-2 ring-primary ring-offset-2",
        isInCart && "border-green-400 bg-green-50"
    )}>
      <div className="flex gap-4 p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange(insight.id, !!checked)}
          className="mt-1"
        />
        <div className="flex-1 space-y-4">
            {/* Question and Answer Section */}
            <div className="space-y-2">
                <div className="flex justify-between items-start">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{insight.sectionTitle}</p>
                    <Badge variant="outline">{insight.boardCategory ? boards.find(b => b.id === insight.boardCategory)?.name : 'Uncategorized'}</Badge>
                </div>
                <h3 className="font-semibold text-foreground">{insight.questionPrompt}</h3>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                    <p className={cn(!isAnswerExpanded && "line-clamp-3")}>{insight.answer}</p>
                </div>
                <Button variant="link" size="sm" onClick={() => setIsAnswerExpanded(!isAnswerExpanded)} className="h-auto p-0 text-xs">
                    {isAnswerExpanded ? <ChevronUp className="h-3 w-3 mr-1"/> : <ChevronDown className="h-3 w-3 mr-1"/>}
                    {isAnswerExpanded ? 'Show Less' : 'Show More'}
                </Button>
            </div>
            
            <Separator />
            
            {/* AI Summary Section */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-inner bg-accent relative">
                <div className="absolute top-2 right-2 flex items-center gap-2 text-white/80 text-xs">
                    <Sparkles className="h-4 w-4" /> AI Summary
                </div>
                <div className="space-y-2">
                   {renderAiSummary()}
                </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center justify-between">
                <div className="w-64">
                    <Select value={insight.boardCategory} onValueChange={handleBoardChange}>
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Assign to board..." />
                        </SelectTrigger>
                        <SelectContent>
                            {boards.map(board => (
                                <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => onAddToCart(insight.id)} disabled={isInCart} className={cn(isInCart && "bg-green-600 hover:bg-green-700")}>
                    {isInCart ? 'Added to Cart' : 'Add to Workshop'}
                </Button>
            </div>
        </div>
      </div>
    </Card>
  );
};