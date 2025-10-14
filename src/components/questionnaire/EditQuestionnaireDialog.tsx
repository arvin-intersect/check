// src/components/questionnaire/EditQuestionnaireDialog.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { Questionnaire } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface EditQuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionnaire: Questionnaire;
}

interface UpdatePayload {
  id: string;
  title: string;
  organization: string;
}

export const EditQuestionnaireDialog = ({ open, onOpenChange, questionnaire }: EditQuestionnaireDialogProps) => {
  const [title, setTitle] = useState(questionnaire.title);
  const [organization, setOrganization] = useState(questionnaire.organization);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  useEffect(() => {
    if (open) {
      setTitle(questionnaire.title);
      setOrganization(questionnaire.organization);
    }
  }, [open, questionnaire]);

  const updateQuestionnaire = async ({ id, title, organization }: UpdatePayload) => {
    return fetchWithAuth(`/api/questionnaires/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, organization }),
    }, getToken);
  };

  const mutation = useMutation({
    mutationFn: updateQuestionnaire,
    onSuccess: (data) => {
      toast({
        title: "Questionnaire updated",
        description: `"${data.title}" has been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['questionnaireDetails', questionnaire.id] });
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a questionnaire title.", variant: "destructive" });
      return;
    }
    mutation.mutate({ id: questionnaire.id, title, organization });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Questionnaire Details</DialogTitle>
          <DialogDescription>Update the title and client organization for this questionnaire.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Questionnaire Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={mutation.isPending}/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="organization">Client Organization</Label>
            <Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} disabled={mutation.isPending}/>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};