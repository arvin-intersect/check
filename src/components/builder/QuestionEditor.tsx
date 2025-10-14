import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";
import type { Question } from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface EditableQuestionCardProps {
  question: Question;
  index: number;
  onUpdate: (questionId: string, updates: Partial<Question>) => void;
}

const EditableQuestionCard = ({ question, index, onUpdate }: EditableQuestionCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handlePromptBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value.trim() && e.target.value !== question.prompt) {
      onUpdate(question.id, { prompt: e.target.value });
    } else {
      e.target.value = question.prompt;
    }
  };

  return (
    <Card ref={setNodeRef} style={style} className="group bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none pt-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Question {index + 1}</span>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-xs">{question.type.replace("_", " ")}</Badge>
                <div className="flex items-center gap-1.5">
                    <Label htmlFor={`required-${question.id}`} className="text-xs font-normal text-muted-foreground">Required</Label>
                    <Switch 
                        id={`required-${question.id}`} 
                        checked={question.is_required} 
                        onCheckedChange={(checked) => onUpdate(question.id, { is_required: checked })}
                        className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
                    />
                </div>
              </div>
            </div>
            <Input 
              defaultValue={question.prompt} 
              onBlur={handlePromptBlur}
              className="font-medium text-base border-none px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0" 
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pl-14">
        <div className="rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">{question.type} response field</p>
        </div>
      </CardContent>
    </Card>
  );
};

interface QuestionEditorProps {
  questions: Question[];
  onUpdateQuestion: (questionId: string, updates: Partial<Question>) => void;
}

export const QuestionEditor = ({ questions, onUpdateQuestion }: QuestionEditorProps) => {
  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <EditableQuestionCard 
          key={question.id} 
          question={question} 
          index={index}
          onUpdate={onUpdateQuestion}
        />
      ))}
      {questions.length === 0 && (
        <div className="text-center p-8 border border-dashed rounded-lg">
          <p className="text-muted-foreground">This section has no questions yet.</p>
        </div>
      )}
    </div>
  );
};
