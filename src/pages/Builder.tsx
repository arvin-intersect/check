import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Plus, Loader2, PartyPopper } from "lucide-react";
import { SectionList } from "@/components/builder/SectionList";
import { QuestionEditor } from "@/components/builder/QuestionEditor";
import { AddQuestionDialog } from "@/components/builder/AddQuestionDialog";
import { AddSectionDialog } from "@/components/builder/AddSectionDialog";
import { ShareDialog } from "@/components/questionnaire/ShareDialog";
import { EditSectionDialog } from "@/components/builder/EditSectionDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Questionnaire, Question, Section } from "@/types";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";

const Builder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  // API Functions
  const fetchFullQuestionnaire = async (id: string): Promise<Questionnaire> => {
    // This endpoint is public for client forms, so we use standard fetch.
    const res = await fetch(`/api/questionnaires/${id}/full`);
    if (!res.ok) throw new Error("Failed to fetch questionnaire data");
    return res.json();
  };

  const publishQuestionnaire = async (id: string): Promise<Questionnaire> => {
    return fetchWithAuth(`/api/questionnaires/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published' }),
    }, getToken);
  };

  const updateQuestion = async (vars: { id: string, updates: Partial<Question>}) => {
    return fetchWithAuth(`/api/questions`, {
        method: 'PATCH',
        body: JSON.stringify({ id: vars.id, ...vars.updates }),
    }, getToken);
  };

  const bulkUpdateQuestionOrder = async (updates: { id: string; order: number }[]) => {
    return fetchWithAuth('/api/questions', {
        method: 'POST',
        body: JSON.stringify(updates)
    }, getToken);
  };
  
  const [localQuestionnaire, setLocalQuestionnaire] = useState<Questionnaire | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isEditSectionOpen, setIsEditSectionOpen] = useState(false);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const { data: questionnaire, isLoading, isError, error } = useQuery<Questionnaire, Error>({
      queryKey: ['fullQuestionnaire', id],
      queryFn: () => fetchFullQuestionnaire(id!),
      enabled: !!id,
  });

  useEffect(() => {
    if (questionnaire) {
        setLocalQuestionnaire(JSON.parse(JSON.stringify(questionnaire)));
        if (!selectedSectionId && questionnaire.sections && questionnaire.sections.length > 0) {
            setSelectedSectionId(questionnaire.sections[0].id);
        }
    }
  }, [questionnaire, selectedSectionId]);

  const publishMutation = useMutation({
      mutationFn: () => publishQuestionnaire(id!),
      onSuccess: () => {
          toast({ title: "🎉 Questionnaire Published!", description: "You can now share the link with your client." });
          queryClient.invalidateQueries({ queryKey: ['fullQuestionnaire', id] });
          queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
          setIsShareDialogOpen(true);
      },
      onError: (e: Error) => toast({ title: "Error", description: e.message, variant: 'destructive' })
  });

  const updateQuestionMutation = useMutation({
      mutationFn: updateQuestion,
      onSuccess: () => toast({ title: "Change saved", duration: 2000 }),
      onError: (e: Error) => {
          toast({ title: "Save Error", description: e.message, variant: 'destructive' });
          queryClient.invalidateQueries({ queryKey: ['fullQuestionnaire', id] });
      }
  });

  const reorderMutation = useMutation({
      mutationFn: bulkUpdateQuestionOrder,
      onError: (e: Error) => {
        toast({ title: "Reorder Error", description: e.message, variant: 'destructive' });
        queryClient.invalidateQueries({ queryKey: ['fullQuestionnaire', id] });
      }
  });

  const handleQuestionUpdate = (questionId: string, updates: Partial<Question>) => {
    setLocalQuestionnaire(prev => {
        if (!prev) return null;
        const newSections = prev.sections?.map(s => ({
            ...s,
            questions: s.questions.map(q => q.id === questionId ? { ...q, ...updates } : q)
        }));
        return { ...prev, sections: newSections };
    });
    updateQuestionMutation.mutate({ id: questionId, updates });
  };
  
  const handleOpenEditSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setIsEditSectionOpen(true);
  }

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const section = localQuestionnaire?.sections?.find(s => s.id === selectedSectionId);
    if (!over || !section || active.id === over.id) return;
    const oldIndex = section.questions.findIndex(q => q.id === active.id);
    const newIndex = section.questions.findIndex(q => q.id === over.id);
    const reorderedQuestions = arrayMove(section.questions, oldIndex, newIndex);
    setLocalQuestionnaire(prev => {
        if (!prev) return null;
        const newSections = prev.sections?.map(s => s.id === selectedSectionId ? { ...s, questions: reorderedQuestions } : s);
        return { ...prev, sections: newSections };
    });
    const updates = reorderedQuestions.map((q, index) => ({ id: q.id, order: index }));
    reorderMutation.mutate(updates);
  };

  const selectedSection = localQuestionnaire?.sections?.find(s => s.id === selectedSectionId);

  if (isLoading || !localQuestionnaire) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Loading Builder...</div>;
  if (isError) return <div className="flex h-screen items-center justify-center text-destructive">Error: {error.message}</div>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex h-screen flex-col bg-surface">
        <ShareDialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} questionnaireId={id!} />
        <AddSectionDialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen} questionnaireId={id!} />
        <EditSectionDialog open={isEditSectionOpen} onOpenChange={setIsEditSectionOpen} section={selectedSection} questionnaireId={id!} />
        <AddQuestionDialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen} sectionId={selectedSectionId} />
        <header className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/questionnaire/${id}`)}><ArrowLeft className="h-4 w-4" /></Button>
                  <div><h1 className="text-lg font-semibold">{localQuestionnaire.title}</h1><p className="text-xs text-muted-foreground">{localQuestionnaire.organization}</p></div>
              </div>
              <div className="flex items-center gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => navigate(`/form-preview/${id}`)}><Eye className="h-4 w-4" />Preview</Button>
                  <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
                      {publishMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PartyPopper className="mr-2 h-4 w-4"/>}
                      Publish
                  </Button>
              </div>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-72 border-r bg-background overflow-y-auto">
            <div className="p-4 border-b"><Button variant="outline" className="w-full gap-2" size="sm" onClick={() => setIsAddSectionOpen(true)}><Plus className="h-4 w-4" />Add Section</Button></div>
            {localQuestionnaire.sections && (<SectionList sections={localQuestionnaire.sections} selectedSectionId={selectedSectionId} onSelectSection={setSelectedSectionId} onEditSection={handleOpenEditSection}/>)}
          </aside>
          <main className="flex-1 overflow-y-auto p-8">
              {selectedSection ? (
                  <div>
                      <div className="mb-6"><h2 className="text-2xl font-semibold">{selectedSection.title}</h2><p className="text-sm text-muted-foreground mt-1">{selectedSection.description || 'Configure questions for this section.'}</p></div>
                      <SortableContext items={selectedSection.questions.map(q => q.id)} strategy={verticalListSortingStrategy}><QuestionEditor questions={selectedSection.questions} onUpdateQuestion={handleQuestionUpdate}/></SortableContext>
                      <Button variant="outline" className="w-full gap-2 mt-4" onClick={() => setIsAddQuestionOpen(true)}><Plus className="h-4 w-4" />Add Question</Button>
                  </div>
              ) : (<div className="flex h-full items-center justify-center text-center"><p className="text-muted-foreground">This questionnaire has no sections. Add one to get started.</p></div>)}
          </main>
        </div>
      </div>
    </DndContext>
  );
};
export default Builder;