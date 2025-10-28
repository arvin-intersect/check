// src/pages/workshop/WorkshopLibrary.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Plus, Search, LayoutGrid, List, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWithAuth } from "@/lib/apiClient";
import { formatDistanceToNow } from 'date-fns';
import type { Workshop } from "@/types";

const WorkshopCard = ({ workshop }: { workshop: Workshop }) => {
  const navigate = useNavigate();
  
  const statusVariant: { [key: string]: "secondary" | "default" | "outline" } = {
    draft: "secondary",
    "in-progress": "default",
    completed: "outline",
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/workshops/${workshop.id}`)}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{workshop.name}</CardTitle>
            <Badge variant={statusVariant[workshop.status] || 'secondary'}>{workshop.status}</Badge>
        </div>
        <CardDescription>{workshop.clientName}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-between items-center text-sm text-muted-foreground">
        <span>{workshop.insightCount || 0} insights</span>
        <span>Updated {formatDistanceToNow(new Date(workshop.updatedAt), { addSuffix: true })}</span>
      </CardContent>
    </Card>
  )
}

const WorkshopLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: workshops, isLoading } = useQuery<Workshop[]>({
    queryKey: ['workshops'],
    queryFn: async () => {
        // Map snake_case from DB to camelCase for frontend
        const data = await fetchWithAuth('/api/workshops', {}, getToken);
        return data.map(ws => ({
            ...ws,
            clientName: ws.client_name,
            questionnaireId: ws.questionnaire_id,
            createdAt: ws.created_at,
            updatedAt: ws.updated_at
        }));
    },
  });

  const createWorkshopMutation = useMutation({
    mutationFn: (newWorkshop: { name: string, client_name: string }) => fetchWithAuth('/api/workshops', {
      method: 'POST',
      body: JSON.stringify(newWorkshop),
    }, getToken),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      navigate(`/workshops/${data.id}?setup=true`);
    },
  });

  const handleCreateNew = () => {
    createWorkshopMutation.mutate({ name: "New Untitled Workshop", client_name: "Unassigned Client" });
  };

  const filteredWorkshops = workshops?.filter(ws => ws.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="relative min-h-full">
      <header className="border-b bg-card/50 backdrop-blur-sm relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Workshop Library</h1>
              <p className="mt-2 text-muted-foreground">Create, manage, and analyze client workshops.</p>
            </div>
            <Button className="gap-2" onClick={handleCreateNew} disabled={createWorkshopMutation.isPending}>
              {createWorkshopMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              New Workshop
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workshops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value)}>
            <ToggleGroupItem value="grid" aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[180px] w-full" />)}
          </div>
        ) : filteredWorkshops && filteredWorkshops.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkshops.map(ws => (
              <WorkshopCard key={ws.id} workshop={ws} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed rounded-lg">
            <h3 className="text-lg font-semibold">No workshops found</h3>
            <p className="text-muted-foreground mt-2">Click "New Workshop" to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkshopLibrary;