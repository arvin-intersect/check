import { cn } from "@/lib/utils";
import { GripVertical, MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Section } from "@/types";

interface SectionListProps {
  sections: Section[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onEditSection: (id: string) => void;
}

export const SectionList = ({ sections, selectedSectionId, onSelectSection, onEditSection }: SectionListProps) => {

  const handleDelete = (id: string, title: string) => {
    alert(`Deletion for "${title}" is not implemented yet.`);
  };

  return (
    <div className="p-2">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelectSection(section.id)}
          className={cn( "w-full text-left p-3 rounded-lg mb-1 transition-colors group relative", "hover:bg-muted", selectedSectionId === section.id && "bg-muted" )}
        >
          <div className="flex items-start gap-2">
            <div className="cursor-grab active:cursor-grabbing pt-0.5"><GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></div>
            <div className="flex-1 min-w-0">
              <h3 className={cn("text-sm font-medium line-clamp-2 mb-1 pr-6", selectedSectionId === section.id ? "text-foreground" : "text-foreground/90")}>{section.title}</h3>
              <p className="text-xs text-muted-foreground">{section.questions.length} questions</p>
            </div>
            <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditSection(section.id); }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(section.id, section.title); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </button>
      ))}
      {sections.length === 0 && (<div className="p-4 text-center text-sm text-muted-foreground">No sections created yet.</div>)}
    </div>
  );
};
