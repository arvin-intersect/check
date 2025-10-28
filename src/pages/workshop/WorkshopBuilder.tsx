// src/pages/workshop/WorkshopBuilder.tsx

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Plus, ArrowLeft, Loader2, Sparkles, Trash2, CheckSquare } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@clerk/clerk-react";
import { fetchWithAuth } from "@/lib/apiClient";
import type { WorkshopBoard, Insight, Questionnaire, Response as ResponseType, Workshop } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { RapidReviewCard } from "@/components/workshop/RapidReviewCard";
import { RightRail } from "@/components/workshop/RightRail";
import { Skeleton } from "@/components/ui/skeleton";

// Define a local type that includes the boards property
type LocalWorkshop = Workshop & { boards?: WorkshopBoard[] };

const transformDataToInsights = (questionnaire, responses) => {
  const insights: Insight[] = [];
  const questionMap = new Map();
  questionnaire.sections?.forEach(section => {
    section.questions.forEach(q => questionMap.set(q.id, { prompt: q.prompt, sectionTitle: section.title }));
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

const WorkshopSetup = ({ onSetupComplete, getToken, workshopName, onNameChange }) => {
  const [step, setStep] = useState(1);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState('');
  
  const { data: questionnaires, isLoading, isError } = useQuery<Questionnaire[]>({
    queryKey: ['questionnairesListForSetup'],
    queryFn: () => fetchWithAuth('/api/questionnaires', {}, getToken),
    staleTime: 300000,
  });
  const [boards, setBoards] = useState<WorkshopBoard[]>([{ id: 'b1', name: 'Vision Board', description: 'High-level goals and desired outcomes.' }, { id: 'b2', name: 'Challenges/Opportunities', description: 'Obstacles and potential growth areas.' }]);
  
  const handleSelectForm = (value: string) => {
    const selectedQ = questionnaires?.find(q => q.id === value);
    if (selectedQ) {
      setSelectedForm(value);
      setSelectedClientName(selectedQ.organization);
      if(!workshopName || workshopName === "New Untitled Workshop") {
        onNameChange(`${selectedQ.organization} Workshop`);
      }
    }
  };
  
  const handleBoardChange = (index, field, value) => setBoards(boards.map((b, i) => i === index ? { ...b, [field]: value } : b));
  const addBoard = () => setBoards([...boards, { id: `b${Date.now()}`, name: '', description: '' }]);
  const removeBoard = (index) => setBoards(boards.filter((_, i) => i !== index));

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl p-0">
        <div className="p-6"><h2 className="text-2xl font-bold">Setup Your Workshop</h2><p className="text-muted-foreground">Configure the data source and structure for this workshop.</p></div>
        <div className="p-6 border-y"><Label>Workshop Name</Label><Input value={workshopName} onChange={(e) => onNameChange(e.target.value)} /></div>
        {step === 1 ? (
          <div className="p-6">
            <CardTitle>Step 1: Select Data Source</CardTitle><CardDescription className="mb-4">Choose the questionnaire responses you want to analyze.</CardDescription><Label>Select Client Form</Label>
            <Select onValueChange={handleSelectForm} disabled={isLoading || isError}>
              <SelectTrigger><SelectValue placeholder={isLoading ? "Loading questionnaires..." : "Select a questionnaire..."} /></SelectTrigger>
              <SelectContent>{isError && <SelectItem value="error" disabled>Failed to load.</SelectItem>}{questionnaires?.map(q => <SelectItem key={q.id} value={q.id}>{q.title} ({q.organization})</SelectItem>)}</SelectContent>
            </Select>
            <div className="mt-6 flex justify-end"><Button onClick={() => setStep(2)} disabled={!selectedForm}>Next: Design Boards</Button></div>
          </div>
        ) : (
          <div className="p-6">
            <CardTitle>Step 2: Design Your Workshop Boards</CardTitle><CardDescription className="mb-4">These boards will be used to categorize insights.</CardDescription>
            <div className="space-y-2">{boards.map((board, index) => ( <div key={board.id} className="flex items-center gap-2"> <Input placeholder="Board Name" value={board.name} onChange={e => handleBoardChange(index, 'name', e.target.value)} /> <Input placeholder="Description" value={board.description} onChange={e => handleBoardChange(index, 'description', e.target.value)} /> <Button variant="ghost" size="icon" onClick={() => removeBoard(index)}><X className="h-4 w-4"/></Button> </div> ))}</div>
            <Button variant="outline" size="sm" onClick={addBoard} className="mt-2 gap-2"><Plus className="h-4 w-4"/>Add Board</Button>
            <div className="mt-6 flex justify-between"><Button variant="link" onClick={() => setStep(1)}>Back</Button><Button onClick={() => onSetupComplete({ formId: selectedForm, clientName: selectedClientName, boards, name: workshopName })}>Start Building Workshop</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const WorkshopBuilder = () => {
  const { id: workshopId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  
  const [workshop, setWorkshop] = useState<LocalWorkshop | null>(null);
  const [needsSetup, setNeedsSetup] = useState(searchParams.get('setup') === 'true');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [cartIds, setCartIds] = useState<Set<string>>(new Set());

  useQuery({ queryKey: ['workshop', workshopId], queryFn: async () => { /* In a real app, you would fetch the workshop details from /api/workshops/:id */ const now = new Date().toISOString(); const mock: LocalWorkshop = { id: workshopId!, name: "New Untitled Workshop", questionnaireId: '', boards: [], clientName: '', status: 'draft', createdAt: now, updatedAt: now, insightCount: 0 }; setWorkshop(mock); return mock; }, enabled: !!workshopId });
  const { data: insightsData, isLoading: insightsLoading, isError: insightsError } = useQuery({ queryKey: ['workshopData', workshop?.questionnaireId], queryFn: async () => { const [q, r] = await Promise.all([ fetch(`/api/questionnaires/${workshop!.questionnaireId}/full`).then(res => res.json()), fetchWithAuth(`/api/questionnaires/${workshop!.questionnaireId}/responses`, {}, getToken) ]); const transformed = transformDataToInsights(q, r); setInsights(transformed); if (transformed.length > 0) setFocusedId(transformed[0].id); return { q, r }; }, enabled: !!workshop?.questionnaireId });
  
  const generateSummaryMutation = useMutation({ mutationFn: async (insightId: string) => { const i = insights.find(i => i.id === insightId); if (!i) throw new Error("Not found"); const res = await fetch('/api/generate-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionsAndAnswers: [{ question: i.questionPrompt, answer: i.answer }] }) }); if (!res.ok) throw new Error("Failed"); const { summary } = await res.json(); const heading = summary.split('. ')[0].replace('Based on your responses, ', '').replace('here is a summary of the key information you provided:', '').trim(); return { insightId, heading, summary }; }, onSuccess: ({ insightId, heading, summary }) => { handleUpdateInsight(insightId, { aiHeading: heading, aiSummary: summary }); toast.success("Summary Generated!"); }, onError: (e: Error) => toast.error("Generation Failed", { description: e.message }) });
  const exportMutation = useMutation({ mutationFn: async () => { const items = insights.filter(i => cartIds.has(i.id)).map(item => ({ heading: item.aiHeading, summary: item.aiSummary, boardCategory: workshop!.boards!.find(b => b.id === item.boardCategory)?.name || 'Uncategorized', })); if(items.length === 0) throw new Error("Cart is empty."); return fetchWithAuth(`/api/questionnaires/${workshopId}/responses`, { method: 'POST', body: JSON.stringify({ insights: items, workshopName: workshop!.name }), }, getToken); }, onSuccess: (data) => toast.success("Exported to Miro!", { action: { label: "Open Board", onClick: () => window.open(data.boardUrl, '_blank') }, duration: 10000, }), onError: (e: Error) => toast.error("Export Failed", { description: e.message }) });
  const updateWorkshopMutation = useMutation({ mutationFn: async (updates: Partial<LocalWorkshop>) => { /* In a real app, you would PATCH to /api/workshops/:id */ setWorkshop(prev => ({...prev!, ...updates})); await queryClient.invalidateQueries({queryKey: ['workshops']}); return Promise.resolve({...workshop!, ...updates}); }});
  
  const handleSetupComplete = (config) => { updateWorkshopMutation.mutate({ questionnaireId: config.formId, boards: config.boards, clientName: config.clientName, name: config.name }); setNeedsSetup(false); searchParams.delete('setup'); setSearchParams(searchParams); };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if(!needsSetup) {
        if (e.key === 'ArrowDown') { e.preventDefault(); const i = insights.findIndex(i => i.id === focusedId); if(i > -1 && i < insights.length - 1){ setFocusedId(insights[i + 1].id); }} 
        else if (e.key === 'ArrowUp') { e.preventDefault(); const i = insights.findIndex(i => i.id === focusedId); if(i > 0) {setFocusedId(insights[i - 1].id); }} 
        else if (e.key === ' ') { e.preventDefault(); if(focusedId) handleSelectionChange(focusedId, !selectedIds.has(focusedId)); } 
        else if (e.key.toLowerCase() === 'a') { e.preventDefault(); if(focusedId && !cartIds.has(focusedId)) handleAddToCart(focusedId); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId, insights, selectedIds, cartIds, needsSetup]);

  const handleSelectionChange = (id, checked) => setSelectedIds(prev => { const newSet = new Set(prev); if (checked) newSet.add(id); else newSet.delete(id); return newSet; });
  const handleUpdateInsight = (id, updates) => setInsights(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  const handleAddToCart = (id) => setCartIds(prev => new Set(prev).add(id));
  const handleBulkAddToCart = () => setCartIds(prev => new Set([...prev, ...selectedIds]));
  const handleRemoveFromCart = (id) => setCartIds(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; });
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === insights.length && insights.length > 0 ? new Set() : new Set(insights.map(i => i.id)));

  if (!workshop) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin"/></div>

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
        {needsSetup && <WorkshopSetup onSetupComplete={handleSetupComplete} getToken={getToken} workshopName={workshop.name} onNameChange={(name) => setWorkshop(prev => ({...prev!, name}))}/>}
        <header className="border-b bg-card p-4 flex items-center gap-4"><Button variant="outline" size="icon" onClick={() => navigate('/workshops')}><ArrowLeft className="h-4 w-4" /></Button><h1 className="text-xl font-semibold">{workshop.name}</h1></header>
        <div className="flex flex-1 h-full overflow-hidden">
            <main className="flex-1 flex flex-col bg-surface overflow-y-auto">
                <div className="sticky top-0 bg-surface/80 backdrop-blur-sm z-10 border-b p-4"><div className="max-w-4xl mx-auto flex items-center gap-4"><Checkbox id="select-all" checked={selectedIds.size === insights.length && insights.length > 0} onCheckedChange={toggleSelectAll} /><Label htmlFor="select-all" className="text-sm font-medium">Select All</Label><Separator orientation="vertical" className="h-6 mx-2"/><Button size="sm" variant="outline" className="gap-2" onClick={handleBulkAddToCart} disabled={selectedIds.size === 0}><CheckSquare className="h-4 w-4"/> Add Selected ({selectedIds.size})</Button><Button size="sm" variant="ghost" className="gap-2 text-muted-foreground hover:text-destructive" onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0}><Trash2 className="h-4 w-4"/> Clear Selection</Button></div></div>
                {insightsLoading ? <div className="p-6 w-full max-w-4xl mx-auto space-y-4"><h2 className="text-2xl font-semibold mb-4">Loading Responses...</h2><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
                 : insightsError ? <div className="text-destructive p-6">Error loading data. Please try again.</div>
                 : (<div className="p-6 space-y-4 max-w-4xl mx-auto">{insights.map(insight => (<RapidReviewCard key={insight.id} insight={insight} isSelected={selectedIds.has(insight.id)} isFocused={focusedId === insight.id} isInCart={cartIds.has(insight.id)} boards={workshop.boards || []} onSelectionChange={handleSelectionChange} onUpdate={handleUpdateInsight} onAddToCart={handleAddToCart} onGenerateSummary={() => generateSummaryMutation.mutate(insight.id)} isGenerating={generateSummaryMutation.isPending && generateSummaryMutation.variables === insight.id}/>))}
                    {insights.length === 0 && !insightsLoading && <div className="text-center py-20"><h3 className="text-lg font-semibold">No responses found</h3><p className="text-muted-foreground">This questionnaire may not have any submitted responses.</p></div>}</div>)}
            </main>
            <RightRail cartItems={insights.filter(i => cartIds.has(i.id))} boards={workshop.boards || []} onRemoveFromCart={handleRemoveFromCart} onExport={exportMutation.mutate} isExporting={exportMutation.isPending}/>
        </div>
    </div>
  );
};

export default WorkshopBuilder;