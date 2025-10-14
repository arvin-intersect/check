// src/pages/Dashboard.tsx
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuestionnaireCard } from "@/components/dashboard/QuestionnaireCard";
import { CreateQuestionnaireDialog } from "@/components/dashboard/CreateQuestionnaireDialog";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Questionnaire, Client } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getToken } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedClient, setSelectedClient] = useState(() => searchParams.get('client') || 'all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchQuestionnaires = async (): Promise<Questionnaire[]> => {
    const data = await fetchWithAuth('/api/questionnaires', {}, getToken);
    return data.map((q: any) => ({
      ...q,
      lastEdited: q.updated_at ? formatDistanceToNow(new Date(q.updated_at), { addSuffix: true }) : 'just now',
      completionRate: 0,
    }));
  };
  
  const fetchClients = async (): Promise<Client[]> => {
      return fetchWithAuth('/api/clients', {}, getToken);
  };

  const { data: questionnaires, isLoading, isError, error, refetch, isFetching } = useQuery<Questionnaire[], Error>({
    queryKey: ['questionnaires'],
    queryFn: fetchQuestionnaires,
  });

  const { data: clients } = useQuery<Client[], Error>({
    queryKey: ['clients'],
    queryFn: fetchClients,
  });

  const filteredQuestionnaires = useMemo(() => {
    return questionnaires?.filter((q) => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.organization.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || q.status === activeTab;
      const matchesClient = selectedClient === "all" || q.organization === selectedClient;
      return matchesSearch && matchesTab && matchesClient;
    }) || [];
  }, [questionnaires, searchQuery, activeTab, selectedClient]);

  const handleClientChange = (clientName: string) => {
    setSelectedClient(clientName);
    const newParams = new URLSearchParams(searchParams);
    if (clientName === 'all') {
      newParams.delete('client');
    } else {
      newParams.set('client', clientName);
    }
    setSearchParams(newParams);
  };
  
  const clearFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    handleClientChange("all");
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
             <Card key={i}><CardHeader><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
          ))}
        </div>
      );
    }
    if (isError) return <div className="text-center text-destructive p-4 rounded-md border border-destructive/50 bg-destructive/10">Failed to load questionnaires: {error.message}</div>;
    if (filteredQuestionnaires.length === 0) {
      return (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed"><div className="text-center"><p className="text-muted-foreground">No questionnaires match your filters.</p><Button variant="outline" className="mt-4 gap-2" onClick={clearFilters}><X className="h-4 w-4" />Clear Filters</Button></div></div>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredQuestionnaires.map((q) => (<QuestionnaireCard key={q.id} questionnaire={q} />))}
      </div>
    );
  };

  return (
    <div className="relative min-h-full">
      <header className="border-b bg-card/50 backdrop-blur-sm relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Intersect Discovery</h1>
                    <p className="mt-2 text-muted-foreground">Create and manage client questionnaires</p>
                </div>
                <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4" />New Questionnaire
                </Button>
            </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search questionnaires..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={selectedClient} onValueChange={handleClientChange}>
                <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Filter by client..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients?.map(client => (
                        <SelectItem key={client.id} value={client.name}>{client.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="draft">Drafts</TabsTrigger><TabsTrigger value="published">Published</TabsTrigger></TabsList>
          <TabsContent value={activeTab} className="space-y-4">{renderContent()}</TabsContent>
        </Tabs>
      </main>
      <CreateQuestionnaireDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}/>
    </div>
  );
};
export default Dashboard;