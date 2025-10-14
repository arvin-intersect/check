import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const mockTemplates = [
  {
    id: "1",
    name: "AI Strategy Discovery",
    industry: "Technology",
    active: true,
    sections: 6,
    questions: 42,
    lastUsed: "2 days ago",
  },
  {
    id: "2",
    name: "Digital Transformation Assessment",
    industry: "Enterprise",
    active: true,
    sections: 8,
    questions: 56,
    lastUsed: "1 week ago",
  },
  {
    id: "3",
    name: "Healthcare AI Readiness",
    industry: "Healthcare",
    active: true,
    sections: 7,
    questions: 48,
    lastUsed: "3 days ago",
  },
  {
    id: "4",
    name: "Financial Services Discovery",
    industry: "Finance",
    active: false,
    sections: 5,
    questions: 38,
    lastUsed: "2 months ago",
  },
  {
    id: "5",
    name: "Retail Innovation Assessment",
    industry: "Retail",
    active: true,
    sections: 6,
    questions: 44,
    lastUsed: "1 week ago",
  },
];

const DiscoveryLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredTemplates = mockTemplates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseTemplate = (templateId: string, templateName: string) => {
    toast({
      title: "Creating questionnaire",
      description: `Creating new questionnaire from "${templateName}"`,
    });
    // In a real app, this would create a new questionnaire and navigate to builder
    setTimeout(() => navigate("/builder"), 500);
  };

  return (
    <div className="relative min-h-full">
      <div className="mx-auto max-w-7xl px-6 py-8 relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-foreground mb-2">Discovery Library</h1>
            <p className="text-muted-foreground">
              Pre-built questionnaire templates for different industries and use cases
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates by name or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-center">Sections</TableHead>
                <TableHead className="text-center">Questions</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.industry}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {template.active ? (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {template.sections}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {template.questions}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {template.lastUsed}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleUseTemplate(template.id, template.name)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Use Template
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Template
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryLibrary;
