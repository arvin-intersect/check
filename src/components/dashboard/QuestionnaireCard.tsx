import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MoreVertical, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Questionnaire } from "@/types"; // <-- IMPORT THE TYPE

interface QuestionnaireCardProps {
  questionnaire: Questionnaire; // <-- USE THE IMPORTED TYPE
}

export const QuestionnaireCard = ({ questionnaire }: QuestionnaireCardProps) => {
  const navigate = useNavigate();
  
  const statusColors = {
    draft: "secondary",
    published: "default",
    closed: "outline",
  } as const;

  return (
    <Card 
      className="group transition-all hover:shadow-md cursor-pointer hover:border-accent/50"
      onClick={() => navigate(`/questionnaire/${questionnaire.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold leading-tight text-foreground line-clamp-2">
              {questionnaire.title}
            </h3>
            <p className="text-sm text-muted-foreground">{questionnaire.organization}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>View responses</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="flex items-center gap-2">
          <Badge variant={statusColors[questionnaire.status]}>
            {questionnaire.status}
          </Badge>
          {questionnaire.status === "published" && questionnaire.responses > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{questionnaire.responses} responses</span>
            </div>
          )}
        </div>

        {questionnaire.status === "published" && questionnaire.completionRate > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium text-foreground">{questionnaire.completionRate}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${questionnaire.completionRate}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{questionnaire.lastEdited}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>by {questionnaire.owner}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/questionnaire/${questionnaire.id}`);
          }}
        >
          {questionnaire.status === "draft" ? "Continue editing" : "View details"}
        </Button>
      </CardFooter>
    </Card>
  );
};