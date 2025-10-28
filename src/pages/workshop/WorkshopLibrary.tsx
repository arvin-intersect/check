// src/pages/workshop/WorkshopLibrary.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Mock data for now - this would come from your API
const mockWorkshops = [
  { id: "ws_1", name: "TechCorp AI Strategy", clientName: "TechCorp Inc", status: "in-progress", insightCount: 12, updatedAt: "2 hours ago" },
  { id: "ws_2", name: "Innovate LLC Q2 Review", clientName: "Innovate LLC", status: "draft", insightCount: 0, updatedAt: "1 day ago" },
  { id: "ws_3", name: "HealthData Co. Workshop", clientName: "HealthData Co.", status: "completed", insightCount: 45, updatedAt: "3 weeks ago" },
];


const WorkshopCard = ({ workshop }) => {
  const navigate = useNavigate();
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/workshops/${workshop.id}`)}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{workshop.name}</CardTitle>
            <Badge variant={workshop.status === 'completed' ? 'secondary' : 'default'}>{workshop.status}</Badge>
        </div>
        <CardDescription>{workshop.clientName}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-between items-center text-sm text-muted-foreground">
        <span>{workshop.insightCount} insights</span>
        <span>Updated {workshop.updatedAt}</span>
      </CardContent>
    </Card>
  )
}

const WorkshopLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const navigate = useNavigate();

  const handleCreateNew = () => {
    // In a real app, this would create a new workshop in the DB and redirect.
    // For now, we'll navigate to a mock ID with a setup flag.
    const newId = `ws_${Date.now()}`;
    navigate(`/workshops/${newId}?setup=true`);
  };

  return (
    <div className="relative min-h-full">
      <header className="border-b bg-card/50 backdrop-blur-sm relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Workshop Library</h1>
              <p className="mt-2 text-muted-foreground">Create, manage, and analyze client workshops.</p>
            </div>
            <Button className="gap-2" onClick={handleCreateNew}>
              <Plus className="h-4 w-4" />New Workshop
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
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockWorkshops.map(ws => (
            <WorkshopCard key={ws.id} workshop={ws} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default WorkshopLibrary;