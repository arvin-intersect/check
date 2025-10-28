// src/pages/workshop/WorkshopBuilder.tsx

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { X, Plus, ArrowLeft, Loader2, Sparkles, Trash2, CheckSquare } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";
import type { WorkshopBoard, Insight, Questionnaire, Response as ResponseType } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { RapidReviewCard } from "@/components/workshop/RapidReviewCard";
import { RightRail } from "@/components/workshop/RightRail";
import { Skeleton } from "@/components/ui/skeleton";

// --- Helper Functions (No changes) ---
const transformDataToInsights = (questionnaire: Questionnaire, responses: ResponseType[]): Insight[] => {
  const insights: Insight[] = [];
  const questionMap = new Map();
  questionnaire.sections?.forEach(section => {
    section.questions.forEach(q => {
      questionMap.set(q.id, { prompt: q.prompt, sectionTitle: section.title });
    });
  });
  responses.forEach(response => {
    Object.entries(response.answers).forEach(([questionId, answer]) => {
      const questionDetails = questionMap.get(questionId);
      if (questionDetails && answer) {
        insights.push({ id: `${response.id}-${questionId}`, questionId, questionPrompt: questionDetails.prompt, sectionTitle: questionDetails.sectionTitle, answer: String(answer), respondentId: response.respondent_id, aiHeading: '', aiSummary: '', tags: [] });
      }
    });
  });
  return insights;
};

// --- CORRECTED WorkshopSetup Component ---
const WorkshopSetup = ({ onSetupComplete, getToken }) => {
  const [step, setStep] = useState(1);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  
  // --- REAL DATA FETCHING ---
  const { data: questionnaires, isLoading, isError } = useQuery<Questionnaire[]>({
    queryKey: ['questionnairesList'],
    queryFn: async () => {
      // Fetching from the same endpoint as your dashboard
      return fetchWithAuth('/api/questionnaires', {}, getToken);
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const defaultBoards: WorkshopBoard[] = [ { id: 'b1', name: 'Vision Board', description: 'High-level goals and desired outcomes.' }, { id: 'b2', name: 'Challenges/Opportunities', description: 'Obstacles and potential growth areas.' }, ];
  const [boards, setBoards] = useState<WorkshopBoard[]>(defaultBoards);
  const handleBoardChange = (index, field, value) => { const newBoards = [...boards]; newBoards[index][field] = value; setBoards(newBoards); };
  const addBoard = () => setBoards([...boards, { id: `b${Date.now()}`, name: '', description: '' }]);
  const removeBoard = (index) => setBoards(boards.filter((_, i) => i !== index));

  if (step === 1) {
    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader><CardTitle>Step 1: Select Data Source</CardTitle><CardDescription>Choose the questionnaire responses you want to analyze.</CardDescription></CardHeader>
            <CardContent className="space-y-4 pt-4">
                <Label>Select Client Form</Label>
                 <Select onValueChange={setSelectedForm} disabled={isLoading || isError}>
                    <SelectTrigger>
                        <SelectValue placeholder={isLoading ? "Loading questionnaires..." : "Search and select a questionnaire..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {isError && <SelectItem value="error" disabled>Failed to load questionnaires.</SelectItem>}
                        {questionnaires?.map((q) => (
                            <SelectItem key={q.id} value={q.id}>
                                {q.title} ({q.organization || 'No Client'})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={() => setStep(2)} disabled={!selectedForm} className="w-full">Next: Design Workshop</Button>
            </CardContent>
        </Card>
    );
  }

  if (step === 2) {
    return ( <Card className="w-full max-w-3xl mx-auto"> <CardHeader><CardTitle>Step 2: Design Your Workshop Boards</CardTitle><CardDescription>These boards will be used to categorize insights.</CardDescription></CardHeader> <CardContent className="space-y-4 pt-4"> {boards.map((board, index) => ( <div key={board.id} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"> <div className="flex-1 grid grid-cols-2 gap-4"> <Input placeholder="Board Name (e.g., Vision)" value={board.name} onChange={e => handleBoardChange(index, 'name', e.target.value)} /> <Textarea placeholder="Short description" value={board.description} onChange={e => handleBoardChange(index, 'description', e.target.value)} rows={1} className="h-10"/> </div> <Button variant="ghost" size="icon" onClick={() => removeBoard(index)}><X className="h-4 w-4"/></Button> </div> ))} <Button variant="outline" onClick={addBoard} className="gap-2"><Plus className="h-4 w-4"/>Add Board</Button> <div className="flex justify-between items-center pt-4"> <Button variant="link" onClick={() => setStep(1)}>Back</Button> <Button onClick={() => onSetupComplete({ formId: selectedForm, boards })}>Start Building Workshop</Button> </div> </CardContent> </Card> );
  }

  return null;
}


// --- Main WorkshopBuilder Page Component ---
const WorkshopBuilder = () => {
  const { id: workshopId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getToken } = useAuth(); // Getting getToken here to pass it down
  
  const [isSetupComplete, setIsSetupComplete] = useState(!searchParams.get('setup'));
  const [workshopConfig, setWorkshopConfig] = useState<any>(null);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [cartIds, setCartIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workshopData', workshopConfig?.formId],
    queryFn: async () => {
      if (!workshopConfig?.formId) return null;
      const [questionnaire, responses] = await Promise.all([ fetch(`/api/questionnaires/${workshopConfig.formId}/full`).then(res => res.json()), fetchWithAuth(`/api/questionnaires/${workshopConfig.formId}/responses`, {}, getToken) ]);
      const transformedInsights = transformDataToInsights(questionnaire, responses);
      setInsights(transformedInsights);
      if (transformedInsights.length > 0) setFocusedId(transformedInsights[0].id);
      return { questionnaire, responses };
    },
    enabled: isSetupComplete && !!workshopConfig?.formId,
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async (insightId: string) => { const insightToSummarize = insights.find(i => i.id === insightId); if (!insightToSummarize) throw new Error("Insight not found"); const res = await fetch('/api/generate-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionsAndAnswers: [{ question: insightToSummarize.questionPrompt, answer: insightToSummarize.answer }] }) }); if (!res.ok) throw new Error("Failed to generate summary"); const { summary } = await res.json(); const sentences = summary.split('. '); const heading = sentences[0].replace('Based on your responses, ', '').replace('here is a summary of the key information you provided:', '').trim(); return { insightId, heading, summary }; },
    onSuccess: ({ insightId, heading, summary }) => { handleUpdateInsight(insightId, { aiHeading: heading, aiSummary: summary }); toast.success("AI Summary Generated!"); },
    onError: (error: Error) => toast.error("Generation Failed", { description: error.message }),
  });
  
  const exportMutation = useMutation({
    mutationFn: async () => {
        const cartItems = insights.filter(i => cartIds.has(i.id)).map(item => ({ heading: item.aiHeading, summary: item.aiSummary, boardCategory: workshopConfig.boards.find(b => b.id === item.boardCategory)?.name || 'Uncategorized', }));
        if(cartItems.length === 0) throw new Error("Your cart is empty.");
        return fetchWithAuth(`/api/questionnaires/${workshopId}/responses`, { method: 'POST', body: JSON.stringify({ miroBoardId: null, insights: cartItems, workshopName: `Workshop: ${workshopId}` }), }, getToken);
    },
    onSuccess: (data) => toast.success("Successfully exported to Miro!", { description: "A board has been created/updated.", action: { label: "Open Board", onClick: () => window.open(data.boardUrl, '_blank') }, duration: 10000, }),
    onError: (error: Error) => toast.error("Export Failed", { description: error.message || "An unknown error occurred." }),
  });

  const handleSetupComplete = (config) => { setWorkshopConfig(config); setIsSetupComplete(true); searchParams.delete('setup'); setSearchParams(searchParams); };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if(isSetupComplete) {
        if (e.key === 'ArrowDown') { e.preventDefault(); const currentIndex = insights.findIndex(i => i.id === focusedId); if(currentIndex > -1){ const nextIndex = Math.min(insights.length - 1, currentIndex + 1); setFocusedId(insights[nextIndex].id); }} 
        else if (e.key === 'ArrowUp') { e.preventDefault(); const currentIndex = insights.findIndex(i => i.id === focusedId); if(currentIndex > -1) {const prevIndex = Math.max(0, currentIndex - 1); setFocusedId(insights[prevIndex].id); }} 
        else if (e.key === ' ') { e.preventDefault(); if(focusedId) handleSelectionChange(focusedId, !selectedIds.has(focusedId)); } 
        else if (e.key.toLowerCase() === 'a') { e.preventDefault(); if(focusedId && !cartIds.has(focusedId)) handleAddToCart(focusedId); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId, insights, selectedIds, cartIds, isSetupComplete]);

  const handleSelectionChange = (id, checked) => setSelectedIds(prev => { const newSet = new Set(prev); if (checked) newSet.add(id); else newSet.delete(id); return newSet; });
  const handleUpdateInsight = (id, updates) => setInsights(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  const handleAddToCart = (id) => setCartIds(prev => new Set(prev).add(id));
  const handleBulkAddToCart = () => setCartIds(prev => new Set([...prev, ...selectedIds]));
  const handleRemoveFromCart = (id) => setCartIds(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; });
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === insights.length ? new Set() : new Set(insights.map(i => i.id)));

  const renderBuilder = () => {
    return (
        <div className="flex flex-1 h-full overflow-hidden">
            <main className="flex-1 flex flex-col bg-surface overflow-y-auto">
                <div className="sticky top-0 bg-surface/80 backdrop-blur-sm z-10 border-b p-4">
                    <div className="max-w-4xl mx-auto flex items-center gap-4">
                        <Checkbox id="select-all" checked={selectedIds.size === insights.length && insights.length > 0} onCheckedChange={toggleSelectAll} />
                        <Label htmlFor="select-all" className="text-sm font-medium">Select All</Label>
                        <Separator orientation="vertical" className="h-6 mx-2"/>
                        <Button size="sm" variant="outline" className="gap-2" onClick={handleBulkAddToCart} disabled={selectedIds.size === 0}><CheckSquare className="h-4 w-4"/> Add Selected ({selectedIds.size})</Button>
                        <Button size="sm" variant="ghost" className="gap-2 text-muted-foreground hover:text-destructive" onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0}><Trash2 className="h-4 w-4"/> Clear Selection</Button>
                    </div>
                </div>
                {isLoading ? <div className="p-6 w-full max-w-4xl mx-auto space-y-4"><h2 className="text-2xl font-semibold mb-4">Loading Responses...</h2><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
                 : isError ? <div className="text-destructive p-6">Error loading data. Please try again.</div>
                 : (
                    <div className="p-6 space-y-4 max-w-4xl mx-auto">
                        {insights.map(insight => (
                            <RapidReviewCard 
                                key={insight.id}
                                insight={insight}
                                isSelected={selectedIds.has(insight.id)}
                                isFocused={focusedId === insight.id}
                                isInCart={cartIds.has(insight.id)}
                                boards={workshopConfig.boards}
                                onSelectionChange={handleSelectionChange}
                                onUpdate={handleUpdateInsight}
                                onAddToCart={handleAddToCart}
                                onGenerateSummary={() => generateSummaryMutation.mutate(insight.id)}
                                isGenerating={generateSummaryMutation.isPending && generateSummaryMutation.variables === insight.id}
                            />
                        ))}
                        {insights.length === 0 && <div className="text-center py-20"><h3 className="text-lg font-semibold">No responses found</h3><p className="text-muted-foreground">This questionnaire doesn't have any submitted responses to analyze.</p></div>}
                    </div>
                )}
            </main>
            <RightRail cartItems={insights.filter(i => cartIds.has(i.id))} boards={workshopConfig.boards} onRemoveFromCart={handleRemoveFromCart} onExport={exportMutation.mutate} isExporting={exportMutation.isPending}/>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
        <header className="border-b bg-card p-4 flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/workshops')}><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="text-xl font-semibold">Workshop: {workshopConfig?.name || 'New Workshop'}</h1>
        </header>
        <div className="flex-1 flex items-center justify-center bg-background">
            {!isSetupComplete 
                ? <WorkshopSetup onSetupComplete={handleSetupComplete} getToken={getToken} />
                : renderBuilder()
            }
        </div>
    </div>
  );
};

export default WorkshopBuilder;