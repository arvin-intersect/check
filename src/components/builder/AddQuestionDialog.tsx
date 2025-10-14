import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface AddQuestionVars {
  sectionId: string;
  prompt: string;
  type: string;
  is_required: boolean;
}

export const AddQuestionDialog = ({ open, onOpenChange, sectionId }: { open: boolean, onOpenChange: (open: boolean) => void, sectionId: string | null }) => {
  const { id: questionnaireId } = useParams<{ id: string }>();
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<string>("text");
  const [required, setRequired] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const addQuestionMutation = async (vars: AddQuestionVars) => {
    return fetchWithAuth('/api/questions', {
      method: 'POST',
      body: JSON.stringify({
          section_id: vars.sectionId,
          prompt: vars.prompt,
          type: vars.type,
          is_required: vars.is_required
      }),
    }, getToken);
  };

  const mutation = useMutation({
      mutationFn: addQuestionMutation,
      onSuccess: () => {
          toast({ title: "Question added successfully" });
          queryClient.invalidateQueries({ queryKey: ['fullQuestionnaire', questionnaireId] });
          onOpenChange(false);
          setPrompt(""); setType("text"); setRequired(false);
      },
      onError: (error: Error) => {
          toast({ title: "Error", description: error.message, variant: 'destructive' });
      }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !sectionId) return;
    mutation.mutate({ sectionId, prompt, type, is_required: required });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>Add New Question</DialogTitle><DialogDescription>Create a new question for this section</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label htmlFor="prompt">Question Prompt *</Label><Input id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} required /></div>
            <div className="grid gap-2">
              <Label htmlFor="type">Question Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="text">Short Text</SelectItem><SelectItem value="textarea">Long Text</SelectItem><SelectItem value="select">Single Choice</SelectItem><SelectItem value="multiselect">Multiple Choice</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2"><Checkbox id="required" checked={required} onCheckedChange={(c) => setRequired(c as boolean)} /><Label htmlFor="required">Required</Label></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={!sectionId || mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Question</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};