// src/pages/ActiveForms.tsx
import { useState } from "react";
import { Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import type { Questionnaire } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";

const ActiveForms = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const fetchQuestionnaires = async (): Promise<Questionnaire[]> => {
    const data = await fetchWithAuth('/api/questionnaires', {}, getToken);
    return data.map((q: any) => ({
        ...q,
        lastEdited: q.updated_at ? formatDistanceToNow(new Date(q.updated_at), { addSuffix: true }) : 'just now',
        completionRate: 0,
    }));
  };

  const { data: questionnaires, isLoading, isError, error } = useQuery<Questionnaire[], Error>({
      queryKey: ['questionnaires'],
      queryFn: fetchQuestionnaires,
  });

  const activeForms = questionnaires
    ?.filter(form => form.status === 'published')
    .filter(form =>
        form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.organization.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <div className="relative min-h-full">
      <div className="mx-auto max-w-7xl px-6 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-foreground mb-2">Active Forms</h1>
          <p className="text-muted-foreground">
            Monitor ongoing questionnaires that have been published to clients.
          </p>
        </div>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search active forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {isLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}</div>
        ) : isError ? (
            <div className="text-center text-destructive">Error: {error.message}</div>
        ) : activeForms.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg"><h3 className="text-lg font-medium">No Active Forms</h3><p className="text-muted-foreground mt-2">Publish a questionnaire from the builder to see it here.</p></div>
        ) : (
            <div className="space-y-4">
                {activeForms.map((form) => (
                    <Card key={form.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2"><CardTitle className="text-xl">{form.title}</CardTitle><Badge variant="default">{form.status}</Badge></div>
                            <CardDescription>{form.organization}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/questionnaire/${form.id}`)}><Eye className="h-4 w-4" />View Responses</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2 text-sm"><span className="text-muted-foreground">Response progress</span><span className="font-medium text-foreground">{form.responses} responses received</span></div>
                            <Progress value={(form.responses / 10) * 100} className="h-2" />
                        </div>
                        </div>
                    </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
export default ActiveForms;