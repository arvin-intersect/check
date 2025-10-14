import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface AddSectionVars {
  questionnaireId: string;
  title: string;
  description?: string;
}

export const AddSectionDialog = ({ open, onOpenChange, questionnaireId }: { open: boolean, onOpenChange: (open: boolean) => void, questionnaireId: string }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const addSectionMutation = async (vars: AddSectionVars) => {
    return fetchWithAuth('/api/sections', {
        method: 'POST',
        body: JSON.stringify({
            questionnaire_id: vars.questionnaireId,
            title: vars.title,
            description: vars.description
        }),
    }, getToken);
  }

  const mutation = useMutation({
      mutationFn: addSectionMutation,
      onSuccess: () => {
          toast({ title: "Section added successfully" });
          queryClient.invalidateQueries({ queryKey: ['fullQuestionnaire', questionnaireId] });
          onOpenChange(false);
          setTitle("");
          setDescription("");
      },
      onError: (error: Error) => {
          toast({ title: "Error", description: error.message, variant: 'destructive' });
      }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate({ questionnaireId, title, description });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>Add New Section</DialogTitle><DialogDescription>Create a new section to organize your questionnaire</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label htmlFor="title">Section Title *</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={mutation.isPending} /></div>
            <div className="grid gap-2"><Label htmlFor="description">Description (optional)</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={mutation.isPending} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Section</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};