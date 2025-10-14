import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Section } from "@/types";

export const FormSection = ({ section, sectionNumber }: { section: Section, sectionNumber: number }) => {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="outline" className="rounded-full">Section {sectionNumber}</Badge>
          <h2 className="text-2xl font-semibold">{section.title}</h2>
        </div>
        <p className="text-muted-foreground">{section.description || 'Please answer the following questions.'}</p>
      </div>

      {section.questions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground shrink-0">{index + 1}.</span>
                <Label className="text-base font-medium leading-relaxed">
                  {question.prompt}
                  {question.is_required && <span className="text-destructive ml-1">*</span>}
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {question.type === "textarea" ? (
              <Textarea placeholder="Type your response here..." className="min-h-[120px]" />
            ) : (
              <Input placeholder="Type your response here..." />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};