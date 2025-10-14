// src/pages/Clients.tsx
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Client } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const fetchClients = async (): Promise<Client[]> => {
    const data = await fetchWithAuth('/api/clients', {}, getToken);
    return data.map((client: any) => ({
        ...client,
        logo: client.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase(),
        lastActivity: formatDistanceToNow(new Date(client.created_at), { addSuffix: true }),
        totalForms: client.totalForms || 0, 
        activeForms: client.activeForms || 0,
        completedForms: client.completedForms || 0,
        draftForms: client.draftForms || 0,
    }));
  };

  const { data: clients, isLoading, isError, error } = useQuery<Client[], Error>({
      queryKey: ['clients'],
      queryFn: fetchClients,
  });

  const filteredClients = clients?.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleClientClick = (clientName: string) => {
    const params = new URLSearchParams({ client: clientName });
    navigate(`/dashboard?${params.toString()}`);
  }

  const renderContent = () => {
      if (isLoading) {
          return (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-3 p-4 border rounded-lg">
                          <Skeleton className="h-20 w-full" />
                          <div className="space-y-2 pt-2">
                              <Skeleton className="h-4 w-4/5" />
                              <Skeleton className="h-4 w-2/5" />
                          </div>
                      </div>
                  ))}
              </div>
          );
      }
      if (isError) {
          return <p className="text-destructive text-center">Error: {error.message}</p>;
      }
      return (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredClients.map((client) => (
                  <Card 
                    key={client.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer hover:border-primary/50"
                    onClick={() => handleClientClick(client.name)}
                  >
                      <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                  <span className="text-lg font-semibold text-foreground">
                                      {client.logo}
                                  </span>
                              </div>
                              <Badge variant="secondary">{client.totalForms} forms</Badge>
                          </div>
                          <CardTitle className="text-xl">{client.name}</CardTitle>
                          <CardDescription>Created {client.lastActivity}</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Active</span>
                                  <span className="font-medium text-primary">{client.activeForms}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Completed</span>
                                  <span className="font-medium text-foreground">{client.completedForms}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Drafts</span>
                                  <span className="font-medium text-muted-foreground">{client.draftForms}</span>
                              </div>
                          </div>
                      </CardContent>
                  </Card>
              ))}
          </div>
      );
  };

  return (
    <div className="relative min-h-full">
      <div className="mx-auto max-w-7xl px-6 py-8 relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-foreground mb-2">Clients</h1>
            <p className="text-muted-foreground">
              Manage client organizations and view their questionnaires
            </p>
          </div>
          <Button className="gap-2" onClick={() => setIsAddClientOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {renderContent()}
        <AddClientDialog 
          open={isAddClientOpen} 
          onOpenChange={setIsAddClientOpen} 
        />
      </div>
    </div>
  );
};

export default Clients;