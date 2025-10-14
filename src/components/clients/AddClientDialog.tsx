import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddClientDialog = ({ open, onOpenChange }: AddClientDialogProps) => {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const createClient = async (newClient: { name: string; domain: string }) => {
    return fetchWithAuth('/api/clients', {
        method: 'POST',
        body: JSON.stringify(newClient),
    }, getToken);
  };

  const mutation = useMutation({
      mutationFn: createClient,
      onSuccess: (data) => {
          toast({
              title: "Client added",
              description: `${data.name} has been added successfully`,
          });
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          setName("");
          setDomain("");
          onOpenChange(false);
      },
      onError: (error: Error) => {
          toast({
              title: "Error",
              description: error.message,
              variant: "destructive",
          });
      }
  });


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Error", description: "Client name is required", variant: "destructive" });
      return;
    }
    mutation.mutate({ name, domain });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a new client organization to manage their questionnaires</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input id="name" placeholder="e.g. TechCorp Inc" value={name} onChange={(e) => setName(e.target.value)} required disabled={mutation.isPending}/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="domain">Domain (optional)</Label>
              <Input id="domain" placeholder="e.g. techcorp.com" value={domain} onChange={(e) => setDomain(e.target.value)} disabled={mutation.isPending}/>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Add Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};