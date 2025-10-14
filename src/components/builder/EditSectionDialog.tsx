import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { Section } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface EditSectionVars {
  id: string;
  title: string;
  description?: string;
}

interface EditSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: Section | null | undefined;
  questionnaireId: string;
}

export const EditSectionDialog = ({ open, onOpenChange, section, questionnaireId }: EditSectionDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  useEffect(() => {
    if (section) {
      setTitle(section.title);
      setDescription(section.description || "");
    }
  }, [section]);

  const updateSectionMutation = async (vars: EditSectionVars) => {
    return fetchWithAuth(`/api/sections`, {
        method: 'PATCH',
        body: JSON.stringify({ id: vars.id, title: vars.title, description: vars.description }),
    }, getToken);
  }

  const mutation = useMutation({
      mutationFn: updateSectionMutation,
      onSuccess: () => {
          toast({ title: "Section updated successfully" });
          queryClient.invalidateQueries({ queryKey: ['fullQuestionnaire', questionnaireId] });
          onOpenChange(false);
      },
      onError: (error: Error) => {
          toast({ title: "Error", description: error.message, variant: 'destructive' });
      }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !section) return;
    mutation.mutate({ id: section.id, title, description });
  };

  if (!section) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>Edit Section</DialogTitle><DialogDescription>Update the details for this section.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label htmlFor="title">Section Title *</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={mutation.isPending} /></div>
            <div className="grid gap-2"><Label htmlFor="description">Description (optional)</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={mutation.isPending} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};