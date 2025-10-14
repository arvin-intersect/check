// src/components/dashboard/CreateQuestionnaireDialog.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface CreateQuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreateVars {
  title: string;
  organization: string;
  description: string;
  owner: string;
}

export const CreateQuestionnaireDialog = ({ open, onOpenChange }: CreateQuestionnaireDialogProps) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createQuestionnaire = async (newQuestionnaire: CreateVars) => {
    return fetchWithAuth('/api/questionnaires', {
      method: 'POST',
      body: JSON.stringify(newQuestionnaire),
    }, getToken);
  };

  const mutation = useMutation({
    mutationFn: createQuestionnaire,
    onSuccess: (data) => {
      toast({
        title: "Questionnaire created",
        description: `"${data.title}" has been created successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      onOpenChange(false);
      setTitle("");
      setOrganization("");
      setDescription("");
    },
    onError: (error: Error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!title.trim()) {
      toast({ title: "Title required", description: "Please enter a questionnaire title", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Authentication Error", description: "Could not identify the current user.", variant: "destructive" });
      return;
    }
    mutation.mutate({ title, organization, description, owner: user.fullName || "Unnamed User" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Questionnaire</DialogTitle>
          <DialogDescription>Start building a new discovery questionnaire for your client</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Questionnaire Title *</Label>
            <Input id="title" placeholder="e.g., Enterprise AI Readiness Assessment" value={title} onChange={(e) => setTitle(e.target.value)} disabled={mutation.isPending}/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="organization">Client Organization</Label>
            <Input id="organization" placeholder="e.g., TechCorp Inc" value={organization} onChange={(e) => setOrganization(e.target.value)} disabled={mutation.isPending}/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Brief description of the questionnaire purpose..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={mutation.isPending}/>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!user || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Questionnaire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};